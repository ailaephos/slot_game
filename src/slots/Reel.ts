import * as PIXI from 'pixi.js';
import { AssetLoader } from '../utils/AssetLoader';

const SYMBOL_TEXTURES = [
    'symbol1.png',
    'symbol2.png',
    'symbol3.png',
    'symbol4.png',
    'symbol5.png',
];

const SPIN_SPEED = 50; // Pixels per frame
const SLOWDOWN_RATE = 0.95; // Rate at which the reel slows down

export class Reel {
    public container: PIXI.Container;
    private symbols: PIXI.Sprite[];
    private symbolSize: number;
    private symbolCount: number;
    private speed: number = 0;
    private isSpinning: boolean = false;
    private replaceSymbolFn: (symbol: PIXI.Sprite) => void;


    constructor(symbolCount: number, symbolSize: number, replaceSymbolFn?: (symbol: PIXI.Sprite) => void) {
        this.container = new PIXI.Container();
        this.symbols = [];
        this.symbolSize = symbolSize;
        this.symbolCount = symbolCount;
        this.replaceSymbolFn = replaceSymbolFn || this.defaultReplaceSymbol;
        this.createSymbols(symbolCount + 1); // Create one extra symbol for the spinning effect
        this.createMask();

    }

    private createSymbols(length: number): void {
        // Create symbols for the reel, arranged horizontally
        for (let i = 0; i < length; i++) {
            const sprite = this.createRandomSymbol();
            sprite.x = (i - 1) * this.symbolSize; // Place symbols horizontally
            sprite.y = 0;
            this.symbols.push(sprite);
            this.container.addChild(sprite);
        }
    }

    private createRandomSymbol(): PIXI.Sprite {
        // TODO:Get a random symbol texture
        const textureName = this.createRandomSymbolTexture();
        // TODO:Create a sprite with the texture
        const texture = AssetLoader.getTexture(textureName);
        const sprite = new PIXI.Sprite(texture);

        sprite.width = this.symbolSize;
        sprite.height = this.symbolSize;

        return sprite;
    }

    private createRandomSymbolTexture(): string {

        return SYMBOL_TEXTURES[Math.floor(Math.random() * SYMBOL_TEXTURES.length)];
    }

    private createMask(): void {
        const mask = new PIXI.Graphics();
        mask.beginFill(0xffffff);
        mask.drawRect(0, 0, this.symbolCount * this.symbolSize, this.symbolSize);
        mask.endFill();

        this.container.addChild(mask);
        this.container.mask = mask;

    }

    public update(delta: number): void {


        if (!this.isSpinning && this.speed === 0) return;

        // TODO:Move symbols horizontally
        const totalWidth = this.symbolCount * this.symbolSize;

        for (const symbol of this.symbols) {
            symbol.x += this.speed * delta;

            if (symbol.x >= totalWidth) {
                // Replace the symbol with a new random one
                this.replaceSymbolFn(symbol);

                // Move the symbol to the left edge of the reel
                symbol.x -= totalWidth + this.symbolSize;
            }
        }

        // If we're stopping, slow down the reel
        if (!this.isSpinning && this.speed > 0) {
            this.speed *= SLOWDOWN_RATE;

            // If speed is very low, stop completely and snap to grid
            if (this.speed < 0.5) {
                this.speed = 0;
                this.snapToGrid();
            }
        }

    }


    private defaultReplaceSymbol(symbol: PIXI.Sprite): void {
        const textureName = this.createRandomSymbolTexture();
        symbol.texture = AssetLoader.getTexture(textureName);
        symbol.width = this.symbolSize;
        symbol.height = this.symbolSize;
    }


    private snapToGrid(): void {
        // TODO: Snap symbols to horizontal grid positions
        for (const symbol of this.symbols) {
            const snappedX = Math.floor(symbol.x / this.symbolSize) * this.symbolSize;
            symbol.x = snappedX;
        }
    }

    public startSpin(): void {
        this.isSpinning = true;
        this.speed = SPIN_SPEED;
    }

    public stopSpin(): void {
        this.isSpinning = false;
        // The reel will gradually slow down in the update method
    }

    public isStopped(): boolean {
        return !this.isSpinning && this.speed < 0.1;
    }


    public getVisibleSymbols(): PIXI.Sprite[] {
        const visibleStart = 0;
        const visibleEnd = this.symbolCount * this.symbolSize;

        const visibleSymbols = this.symbols.filter(symbol =>
            symbol.x + symbol.width > visibleStart &&
            symbol.x < visibleEnd
        );

        // Sort the visible symbols by their x position in ascending order
        visibleSymbols.sort((a, b) => a.x - b.x);

        return visibleSymbols;
    }

    public getSymbolSize(): number {
        return this.symbolSize;
    }
    public getSymbolCount(): number {
        return this.symbolCount;
    }



}
