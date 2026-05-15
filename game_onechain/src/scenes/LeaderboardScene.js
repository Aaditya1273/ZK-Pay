import * as Phaser from "phaser";

export class LeaderboardScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LeaderboardScene' });
        this.provider = null;
        this.signer = null;
        this.account = null;
    }

    init(data) {
        this.provider = data.provider;
        this.signer = data.signer;
        this.account = data.account;
    }

    preload() {
        this.load.video(
            "bg_video",
            "assets/cut-scene/bg04_animated.mp4",
            "loadeddata",
            false,
            true
        );
    }

    create() {
        const framePadding = 20;
        const frameWidth = this.cameras.main.width - framePadding * 2;
        const frameHeight = this.cameras.main.height - framePadding * 2;
        const cornerRadius = 30;

        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffff00);
        maskShape.fillRoundedRect(framePadding, framePadding, frameWidth, frameHeight, cornerRadius);
        this.cameras.main.setMask(maskShape.createGeometryMask());

        const frame = this.add.graphics();
        frame.lineStyle(10, 0xd4af37, 1);
        frame.strokeRoundedRect(framePadding, framePadding, frameWidth, frameHeight, cornerRadius);
        frame.setDepth(100);
        const { width, height } = this.scale;

        const bgVideo = this.add.video(width / 2, height / 2, "bg_video").play(true);
        bgVideo.setScale(Math.min(width / bgVideo.width, height / bgVideo.height) * 0.45).setScrollFactor(0).setOrigin(0.5);
        this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

        const panelWidth = 600;
        const panelHeight = 500;
        const panelX = width / 2;
        const panelY = height / 2;

        this.add.graphics()
            .fillStyle(0x1a1a1a, 0.9)
            .fillRoundedRect(panelX - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 20)
            .lineStyle(2, 0xd4af37, 1)
            .strokeRoundedRect(panelX - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 20);

        this.add.text(width / 2, panelY - 180, 'LEADERBOARD', {
            fontFamily: 'Georgia, serif',
            fontSize: '48px',
            color: '#ffffff',
            align: 'center',
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 5, stroke: true, fill: true }
        }).setOrigin(0.5);

        this.fetchAndDisplayLeaderboard();

        this.add.text(width / 2, panelY + 200, 'Press SPACE to return to village', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.start('MenuScene', { 
                provider: this.provider, 
                signer: this.signer, 
                account: this.account 
            });
        });
    }

    async fetchAndDisplayLeaderboard() {
        const { width, height } = this.scale;
        const panelY = height / 2;

        if (!this.account) {
            this.add.text(width / 2, panelY, 'Error: Wallet not connected.', { fontSize: '20px', color: '#ff0000' }).setOrigin(0.5);
            return;
        }

        const loadingText = this.add.text(width / 2, panelY, 'Loading 0G Data...', { fontSize: '24px', color: '#cccccc' }).setOrigin(0.5);

        try {
            // Fetch completions from backend for this user
            const response = await fetch(`http://localhost:8000/api/completions/${this.account}`);
            const result = await response.json();

            loadingText.destroy();

            if (!result.success) {
                throw new Error("Failed to fetch data.");
            }

            const leaderboardData = result.completions.map(comp => ({
                address: comp.userAddress,
                score: comp.score
            }));

            leaderboardData.sort((a, b) => b.score - a.score);
            this.displayLeaderboard(leaderboardData);

        } catch (error) {
            console.error("Failed to fetch leaderboard:", error);
            loadingText.setText('No scores found on 0G yet.');
        }
    }

    displayLeaderboard(data) {
        const { width, height } = this.scale;
        const panelX = width / 2;
        const startY = height / 2 - 120;
        const lineHeight = 30;
        const maxEntries = 10;

        if (data.length === 0) {
            this.add.text(panelX, height / 2, 'No scores recorded yet.', { fontSize: '20px', color: '#cccccc' }).setOrigin(0.5);
            return;
        }

        for (let i = 0; i < Math.min(data.length, maxEntries); i++) {
            const entry = data[i];
            const rank = `${i + 1}.`;
            const address = `${entry.address.substring(0, 6)}...${entry.address.substring(entry.address.length - 4)}`;
            const score = entry.score.toString();
            const y = startY + i * lineHeight;

            const textStyle = { fontFamily: 'Arial', fontSize: '18px', color: '#ffffff' };
            this.add.text(panelX - 200, y, rank, textStyle).setOrigin(0, 0.5);
            this.add.text(panelX - 150, y, address, textStyle).setOrigin(0, 0.5);
            this.add.text(panelX + 200, y, score, textStyle).setOrigin(1, 0.5);
        }
    }
}