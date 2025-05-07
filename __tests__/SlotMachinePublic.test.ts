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
        // Check if the number of reels is correct using public API
        expect(machine.getReels().length).toBe(4);
    
        // Check the number of visible symbols on each reel using public API
        machine.getReels().forEach((reel) => {
            const visibleSymbolCount = reel.getVisibleSymbols();
            const expectedVisibleCount = 6;
            expect(visibleSymbolCount.length).toBe(expectedVisibleCount);
        });
    });
    
    it('should start spinning with sound when spin() is called', () => {
        // Access spinButton using the public getter
        const spinButton = ui.getSpinButton();
        expect(spinButton).toBeDefined();
    
        // Check the initial state
        expect(machine.getIsSpinning()).toBe(false);
        expect(spinButton?.interactive).toBe(true);
    
        // Call the spin method
        machine.spin();
    
        // Check if spinning started and button was disabled
        expect(machine.getIsSpinning()).toBe(true);
        expect(sound.play).toHaveBeenCalledWith('Reel spin');
        expect(spinButton?.interactive).toBe(false); // Disable the button
    });
    
    it('should play big win animation on win', () => {
    
        const winAnimation = machine.getWinAnimation();  // Access the public winAnimation directly
    
        machine.spin();
    
        jest.advanceTimersByTime(5000); // Simulate time for the spin to complete   
    
        machine.testCheckWin(true);
    
        // Check that win animation and sound were triggered
        if (winAnimation) {
            expect(winAnimation.state.setAnimation).toHaveBeenCalledWith(0, 'start', false);
        }
        expect(sound.play).toHaveBeenCalledWith('win');
    });

      
    it('should not show animation on no win', () => {
    
        const winAnimation = machine.getWinAnimation();  // Access the public winAnimation directly
    
        machine.spin();
    
        jest.advanceTimersByTime(5000); // Simulate time for the spin to complete   
    
        machine.testCheckWin(false);
    
        // Check that win animation and sound were triggered
        if (winAnimation) {
            expect(winAnimation.state.setAnimation).not.toHaveBeenCalled();
        }
     
    });
    
    it('should snap visible reel symbols to horizontal grid when stopped', () => {
        const delta = app.ticker.deltaMS;
    
        // Start the spin
        machine.spin();
    
        expect(machine.getIsSpinning()).toBe(true);
    
        // Simulate updating the reels on each frame
        for (let i = 0; i < 500; i++) {
            machine.getReels().forEach((reel: Reel) => reel.update(delta));
            jest.advanceTimersByTime(delta);
        }
    
        expect(machine.getIsSpinning()).toBe(false);
    
        machine.getReels().forEach((reel: Reel) => {
            expect(reel.isStopped()).toBe(true);
    
            // Retrieve the visible symbols from the reel
            const visibleSymbols = reel.getVisibleSymbols();
    
            let expectedX = 0;
            visibleSymbols.forEach(symbol => {
                // Check if the symbol's x position is snapped to the grid
                const snapped = symbol.x % reel.getSymbolSize();
                expect(snapped).toBe(0);
    
                // Check the x position of the symbol to ensure they align horizontally
                expect(symbol.x).toBe(expectedX);
                expectedX += reel.getSymbolSize();
            });
    
            // Check the last symbol to ensure it's properly snapped
            const lastSymbol = visibleSymbols[visibleSymbols.length - 1];
            const visibleAreaEnd = reel.getSymbolCount() * reel.getSymbolSize();
            expect(lastSymbol.x + lastSymbol.width).toBe(visibleAreaEnd);
        });
    });
    
    it('should stop reel sound when all reels have stopped', () => {
        // Start the spin
        machine.spin();
    
        // Check that the reel sound is playing
        expect(machine.reelSoundPlaying).toBe(true);
    
        const delta = app.ticker.deltaMS;
    
        // Simulate updates for the reels over time
        for (let i = 0; i < 300; i++) {
            machine.update(delta);
            jest.advanceTimersByTime(delta);
        }
    
        // At this point, all reels should be stopped
        const allStopped = machine.getReels().every((reel: Reel) => reel.isStopped());
        expect(allStopped).toBe(true);
    
        // Reel sound should be stopped now
        expect(machine.reelSoundPlaying).toBe(false);
        expect(sound.stop).toHaveBeenCalledWith('Reel spin');
    });
    
    it('should replace symbols that go beyond total width during spin', () => {
        const mockReplaceSymbol = jest.fn();
    
        const symbolSize = 150;
        const symbolCount = 7;
        const reel = new Reel(symbolCount, symbolSize, mockReplaceSymbol);

        reel.startSpin();

        const delta = app.ticker.deltaMS;
        // Simulate updates for the reels over time
        for (let i = 0; i < 300; i++) {
            reel.update(delta);
            jest.advanceTimersByTime(delta);
        }
    
        // Check if the replaceSymbol function was called
        expect(mockReplaceSymbol).toHaveBeenCalled();
    });



});
