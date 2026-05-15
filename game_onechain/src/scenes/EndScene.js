// undo 01
import * as Phaser from "phaser";
import { ethers } from 'ethers';
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
        this.cameras.main.fadeIn(800, 0, 0, 0);
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.85).setOrigin(0);

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        const titleText = this.endGameData.isCorrect ? 'Mystery Solved!' : 'Case Closed...';
        const titleColor = this.endGameData.isCorrect ? '#2ecc71' : '#e74c3c';

        this.add.text(centerX, centerY - 200, titleText, {
            fontFamily: 'Georgia, serif',
            fontSize: '64px',
            color: titleColor,
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const stats = [
            `Final Score: ${this.endGameData.score}`,
            `Total Time: ${this.endGameData.time}`,
            `Total Guesses: ${this.endGameData.guesses}`
        ];

        this.add.text(centerX, centerY, stats, {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 20
        }).setOrigin(0.5);

        const menuButton = this.add.text(centerX, centerY + 180, 'Return to Menu', {
            fontSize: '28px',
            fill: '#2ecc71',
            padding: { x: 20, y: 10 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => window.location.reload());

        this.statusText = this.add.text(centerX, centerY + 260, 'Finalizing your journey on 0G...', {
            fontSize: '18px',
            fill: '#d4af37'
        }).setOrigin(0.5);

        if (this.account) {
            this.finalizeGame();
        }
    }

    async finalizeGame() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            this.statusText.setText('Anchoring dialogue to 0G Storage...');
            
            const result = await submitGameResult({
                game_id: this.endGameData.gameSessionId,
                user_address: this.account,
                score: this.endGameData.score,
                won: this.endGameData.isCorrect
            });

            if (result.success) {
                this.statusText.setText(`✓ Journey anchored to 0G! Reward: ${result.reward || 0} FOG`);
                this.statusText.setColor('#2ecc71');
            } else {
                this.statusText.setText('Failed to anchor journey to 0G.');
                this.statusText.setColor('#e74c3c');
            }
        } catch (error) {
            console.error("Finalization failed:", error);
            this.statusText.setText('Error finalizing journey.');
        } finally {
            this.isProcessing = false;
        }
    }
}
