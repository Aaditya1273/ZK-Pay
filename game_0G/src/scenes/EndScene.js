import * as Phaser from "phaser";
import { submitGameResult } from '../api';

export class EndScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EndScene' });
        this.isProcessing = false;
        this.statusText = null;
    }

    init(data) {
        this.endGameData = data;
        this.account = data?.account;
        this.signer = data?.signer;
    }

    create() {
        this.cameras.main.fadeIn(1000, 0, 0, 0);
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x050505, 0.95).setOrigin(0);

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        const titleText = this.endGameData.isCorrect ? 'MYSTERY SOLVED' : 'LOST IN THE FOG';
        const titleColor = this.endGameData.isCorrect ? '#2dd4bf' : '#e74c3c';

        // Title with Cinzel font
        this.add.text(centerX, centerY - 220, titleText, {
            fontFamily: 'Cinzel',
            fontSize: '72px',
            color: titleColor,
            stroke: '#000000',
            strokeThickness: 2,
            letterSpacing: 4
        }).setOrigin(0.5);

        // Decorative line
        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0x2dd4bf, 0.3);
        graphics.lineBetween(centerX - 200, centerY - 150, centerX + 200, centerY - 150);

        const stats = [
            `SCORE: ${this.endGameData.score}`,
            `TIME: ${this.endGameData.time}`,
            `GUESSES: ${this.endGameData.guesses}`,
            `TRUE ENDING: ${this.endGameData.isTrueEnding ? 'YES' : 'NO'}`
        ];

        this.add.text(centerX, centerY, stats, {
            fontFamily: 'Inter',
            fontSize: '24px',
            color: '#aaaaaa',
            align: 'center',
            lineSpacing: 15,
            letterSpacing: 2
        }).setOrigin(0.5);

        // Status Text
        this.statusText = this.add.text(centerX, centerY + 140, 'SYNCHRONIZING WITH 0G NEWTON...', {
            fontFamily: 'Inter',
            fontSize: '14px',
            color: '#2dd4bf',
            letterSpacing: 2
        }).setOrigin(0.5);

        // Menu Button
        const menuButton = this.add.text(centerX, centerY + 240, 'RETURN TO THE VOID', {
            fontFamily: 'Cinzel',
            fontSize: '24px',
            color: '#000000',
            backgroundColor: '#2dd4bf',
            padding: { x: 40, y: 15 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => window.location.reload())
        .on('pointerover', () => menuButton.setBackgroundColor('#ffffff'))
        .on('pointerout', () => menuButton.setBackgroundColor('#2dd4bf'));

        if (this.account) {
            this.finalizeGame();
        }
    }

    async finalizeGame() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            this.statusText.setText('ANCHORING JOURNEY TO 0G STORAGE...');
            
            const result = await submitGameResult({
                game_id: this.endGameData.gameSessionId,
                user_address: this.account,
                score: this.endGameData.score,
                won: this.endGameData.isCorrect,
                is_true_ending: this.endGameData.isTrueEnding
            });

            if (result.success) {
                const reward = (result.reward / 1e18).toFixed(2);
                this.statusText.setText(`✓ JOURNEY ANCHORED. REWARD: ${reward} FOG DISTRIBUTED.`);
                this.statusText.setColor('#2dd4bf');
            } else {
                this.statusText.setText('PROTOCOL ERROR: FAILED TO ANCHOR JOURNEY.');
                this.statusText.setColor('#e74c3c');
            }
        } catch (error) {
            console.error("Finalization failed:", error);
            this.statusText.setText('CRITICAL ERROR: CONNECTION TO 0G LOST.');
            this.statusText.setColor('#e74c3c');
        } finally {
            this.isProcessing = false;
        }
    }
}
