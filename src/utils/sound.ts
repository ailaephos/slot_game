// TODO: Implement sound player using the "howler" package
import { Howl } from 'howler';

const sounds: Record<string, Howl> = {};

export const sound = {
    add: (alias: string, url: string): void => {
        if (sounds[alias]) {
            console.warn(`Sound already exists: ${alias}`);
            return;
        }

        sounds[alias] = new Howl({
            src: [url],
            preload: true,
        });

        console.log(`Sound added: ${alias} from ${url}`);
    },
    play: (alias: string): void => {
        const sfx = sounds[alias];
        if (!sfx) {
            console.warn(`Sound not found: ${alias}`);
            return;
        }

        sfx.play();
        console.log(`Playing sound: ${alias}`);
    },
    stop: (alias: string): void => {
        const sfx = sounds[alias];
        if (sfx) {
            sfx.stop();
            console.log(`Stopped sound: ${alias}`);
        }
    }
};
