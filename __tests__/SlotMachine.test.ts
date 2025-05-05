import * as PIXI from 'pixi.js';
import { SlotMachine } from '../src/slots/SlotMachine';

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

jest.mock('../src/utils/sound', () => ({
    sound: {
        play: jest.fn(),
        stop: jest.fn(),
    },
}));

describe('SlotMachine', () => {
    let app: PIXI.Application;
    let machine: SlotMachine;

    beforeEach(() => {
        app = new PIXI.Application({ width: 800, height: 600 }) as unknown as PIXI.Application;
        machine = new SlotMachine(app);
        jest.useFakeTimers(); 
    });

    afterEach(() => {
        jest.clearAllMocks(); 
        jest.useRealTimers(); 
    });

    it('should set isSpinning to true when spin is called', () => {
        machine.spin();
        expect((machine as any).isSpinning).toBe(true);
      });

    it('should play the "Reel spin" sound when spin() is called', async () => {
        machine.spin(); 
        const { sound } = require('../src/utils/sound');
        expect(sound.play).toHaveBeenCalledWith('Reel spin');
    });

});
