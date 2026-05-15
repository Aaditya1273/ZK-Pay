import * as Phaser from "phaser";

export class ItemLockScene extends Phaser.Scene {
    constructor() {
        super({ key: "ItemLockScene" });
        this.villager = null;
        this.provider = null;
        this.signer = null;
        this.account = null;
        this.gameData = null;
        this.statusText = null;
        this.playerInventory = null;
    }

    init(data) {
        this.villager = data.villager;
        this.provider = data.provider;
        this.signer = data.signer;
        this.account = data.account;
        this.gameData = data.gameData;
        this.playerInventory = data.playerInventory;
    }

    create() {
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7).setOrigin(0);
        const panelWidth = this.cameras.main.width * 0.7;
        const panelHeight = this.cameras.main.height * 0.6;
        const panelX = this.cameras.main.centerX;
        const panelY = this.cameras.main.centerY;

        this.add.graphics()
            .fillStyle(0x1a1a1a, 1)
            .fillRoundedRect(panelX - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 16)
            .lineStyle(2, 0xd4af37, 1)
            .strokeRoundedRect(panelX - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 16);

        const requiredItemName = this.villager.requiredItem.replace(/_/g, ' ');

        this.add.text(panelX, panelY - panelHeight / 2+ 50, `Villager Requires ${requiredItemName}`, {
            fontFamily: 'Georgia, serif', fontSize: '32px', color: '#ffffff', align: 'center'
        }).setOrigin(0.5);

        this.add.text(panelX, panelY - panelHeight / 2 + 120, `This villager will only talk if you provide them a ${requiredItemName}. This will consume the item from your inventory.`, {
            fontFamily: 'Arial', fontSize: '20px', color: '#dddddd', align: 'center', wordWrap: { width: panelWidth - 80 }
        }).setOrigin(0.5);

        const hasItem = this.playerInventory && this.playerInventory.has(this.villager.requiredItem);
        
        this.statusText = this.add.text(panelX, panelY + 50, 
            hasItem ? `You have the ${requiredItemName}!` : `You need to find a ${requiredItemName} first.`, 
            {
                fontFamily: 'Arial', fontSize: '22px', 
                color: hasItem ? '#4CAF50' : '#ff6b6b', 
                align: 'center'
            }
        ).setOrigin(0.5);

        if (hasItem) {
            this.createButton(panelX, panelY + panelHeight / 2 - 120, 'Offer Item', () => this.tradeItem());
        }
        this.createButton(panelX, panelY + panelHeight / 2 - 60, 'Close', () => this.closeScene());
    }

    async tradeItem() {
        this.statusText.setText(`Offering ${this.villager.requiredItem.replace(/_/g, ' ')}...`);

        try {
            // Local inventory management for the 0G flow
            const homeScene = this.scene.get('HomeScene');
            if (homeScene && homeScene.playerInventory) {
                homeScene.playerInventory.delete(this.villager.requiredItem);
            }

            this.statusText.setText("Offer accepted! The villager is now willing to talk.");
            this.statusText.setColor('#4CAF50');
            
            // Emit event to HomeScene
            homeScene.events.emit('villagerUnlocked', this.villager.name);

            this.time.delayedCall(1500, () => this.closeScene());

        } catch (error) {
            console.error("Trade failed:", error);
            this.statusText.setText("Trade failed.");
        }
    }

    closeScene() {
        this.scene.resume('HomeScene');
        this.scene.stop();
    }

    createButton(x, y, text, callback) {
        const button = this.add.text(x, y, text, {
            fontFamily: 'Arial', fontSize: '24px', color: '#000000',
            backgroundColor: '#d4af37', padding: { x: 20, y: 10 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        button.on('pointerover', () => button.setBackgroundColor('#f5d56b'));
        button.on('pointerout', () => button.setBackgroundColor('#d4af37'));
        button.on('pointerdown', callback);
        return button;
    }
}
