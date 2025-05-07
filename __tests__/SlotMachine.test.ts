import * as PIXI from 'pixi.js';
import { SlotMachine } from '../src/slots/SlotMachine';
import { UI } from '../src/ui/UI';
import { sound } from '../src/utils/sound';
import { Reel } from '../src/slots/Reel';



jest.mock('pixi.js', () => {
    const actualPixi = jest.requireActual('pixi.js');

    return {
        ...actualPixi,
        Application: jest.fn().mockImplementation(() => ({
            stage: { addChild: jest.fn() },
            renderer: { plugins: {} },
            ticker: {
                add: jest.fn(),
                stop: jest.fn(),
                remove: jest.fn(),
                deltaMS: 1000 / 60,  // Mock delta for 60 FPS
            },
            view: {},
            destroy: jest.fn(),
            screen: {
                width: 800,
                height: 600,
            },
        })),
        Container: jest.fn().mockImplementation(() => ({
            addChild: jest.fn(),
            x: 0,
            y: 0,
            mask: null,
        })),
        Graphics: jest.fn().mockImplementation(() => ({
            beginFill: jest.fn(),
            drawRect: jest.fn(),
            endFill: jest.fn(),
        })),
    };
});

jest.mock('pixi-spine', () => {
    return {
        Spine: jest.fn().mockImplementation(() => {
            return {
                state: {
                    setAnimation: jest.fn(),
                    data: {},
                    skeletonData: {},
                    tracks: [],
                    listeners: [],
                    timeScale: 1,
                },
                visible: false,
                x: 0,
                y: 0,
            };
        }),
    };
});


jest.mock('../src/utils/sound', () => ({
    sound: {
        play: jest.fn(),
        stop: jest.fn(),
    },
}));

describe('SlotMachine', () => {
    let app: jest.Mocked<PIXI.Application>;
    let machine: SlotMachine;
    let ui: UI;


    beforeEach(() => {

        jest.resetModules();
        
        app = new PIXI.Application({ width: 800, height: 600 }) as jest.Mocked<PIXI.Application>;
        machine = new SlotMachine(app);
        ui = new UI(app, machine);

        jest.useFakeTimers();
    });

    afterEach(() => {

        jest.useRealTimers();
        jest.clearAllMocks();

    });



    it('should initialize correct number of reels with correct number of visible symbols', () => {
        // Check if the number of reels is correct
        expect(machine['reels'].length).toBe(4);

        // Check the number of visible symbols on each reel
        machine['reels'].forEach((reel: Reel) => {
            const visibleSymbolCount = reel.getVisibleSymbols();
            const expectedVisibleCount = 6;
            expect(visibleSymbolCount.length).toBe(expectedVisibleCount);
        });
    });

    it('should start spinning with sound when spin() is called', () => {

        expect(ui['spinButton']).toBeDefined();

        expect((machine as any).isSpinning).toBe(false);

        expect(ui['spinButton'].interactive).toBe(true);

        machine.spin();

        expect((machine as any).isSpinning).toBe(true);

        expect(sound.play).toHaveBeenCalledWith('Reel spin');

        expect(ui['spinButton'].interactive).toBe(false); // Disable the button
    });

    it('should play big win animation on win', () => {

        // Mocking the winAnimation using the mocked Spine class
        const winAnimation = new (require('pixi-spine').Spine)();
        machine['winAnimation'] = winAnimation;  // Assign to machine


        machine['checkWin'] = jest.fn().mockImplementation(() => {
            sound.play('win');
            if (machine['winAnimation']) {
                machine['winAnimation'].visible = true;
                machine['winAnimation'].state.setAnimation(0, 'start', false);
            }
        });

        machine.spin();

        jest.advanceTimersByTime(5000); // Simulate time for the spin to complete   

        // Check that win animation and sound were triggered
        if (winAnimation) {  
            expect(winAnimation.state.setAnimation).toHaveBeenCalledWith(0, 'start', false);
        }
        expect(sound.play).toHaveBeenCalledWith('win');


    });

    it('should not show animation on no win', () => {

        // Mocking the winAnimation using the mocked Spine class
        const winAnimation = new (require('pixi-spine').Spine)();
        machine['winAnimation'] = winAnimation;  


        machine['checkWin'] = jest.fn().mockImplementation(() => {
           
        });

        machine.spin();

        jest.advanceTimersByTime(5000); // Simulate time for the spin to complete   

        // Check that win animation and sound were triggered
        if (winAnimation) {  
            expect(winAnimation.state.setAnimation).not.toHaveBeenCalled();
        }
       
    });

    it('should snap visible reel symbols to horizontal grid when stopped', () => {

        const delta = app.ticker.deltaMS;

        machine.spin();

        expect(machine['isSpinning']).toBe(true);

        // Simulate updating the reels on each frame
        for (let i = 0; i < 500; i++) {
            machine['reels'].forEach((reel: Reel) => reel.update(delta));
            jest.advanceTimersByTime(delta);
        }

        expect(machine['isSpinning']).toBe(false);

        machine['reels'].forEach((reel: Reel) => {
            expect(reel.isStopped()).toBe(true);

            const visibleSymbols = reel.getVisibleSymbols();

            let expectedX = 0;
            visibleSymbols.forEach(symbol => {
                const snapped = symbol.x % reel['symbolSize'];
                expect(snapped).toBe(0);

                expect(symbol.x).toBe(expectedX);
                expectedX += reel['symbolSize'];
            });

            const lastSymbol = visibleSymbols[visibleSymbols.length - 1];
            const visibleAreaEnd = reel['symbolCount'] * reel['symbolSize'];
            expect(lastSymbol.x + lastSymbol.width).toBe(visibleAreaEnd);
        });

    });


    it('should stop reel sound when all reels have stopped', () => {

        machine.spin();

        expect((machine as any).reelSoundPlaying).toBe(true);

        const delta = app.ticker.deltaMS;

        for (let i = 0; i < 300; i++) {
            machine.update(delta);
            jest.advanceTimersByTime(delta);
        }

        // At this point, all reels should be stopped
        const allStopped = machine['reels'].every((reel: any) => reel.isStopped());
        expect(allStopped).toBe(true);

        // Reel sound should be stopped now
        expect((machine as any).reelSoundPlaying).toBe(false);
        expect(sound.stop).toHaveBeenCalledWith('Reel spin');

    });


    it('should replace symbols that go beyond total width during spin', () => {
        const reel = machine['reels'][0];
        const spy = jest.spyOn(reel as any, 'replaceSymbolFn');

        // Manually position a symbol beyond total reel width (reel.symbolCount * symbolSize)
        const totalWidth = reel['symbolCount'] * reel['symbolSize'];
        reel['symbols'][0].x = totalWidth + 1; // Force it just beyond the visible area

        reel['speed'] = 10;
        reel['isSpinning'] = true;

        reel.update(1); // Simulate one frame

        expect(spy).toHaveBeenCalled();
    });

});
