import * as Phaser from "phaser";
import { startNewGame } from "../api";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
    this.provider = null;
    this.signer = null;
    this.account = null;
    this.userAvatar = null;
    this.statusText = null;
  }

  init(data) {
    this.provider = data?.provider;
    this.signer = data?.signer;
    this.account = data?.account;
    this.userAvatar = data?.userAvatar;
  }

  preload() {
    for (let i = 1; i <= 10; i++) {
      this.load.image(`mc_${i}`, `/assets/images/characters/mc_${i}.png`);
    }
    this.load.video('bg04_animated', '/assets/cut-scene/bg04_animated.mp4', 'loadeddata', false, true);
  }

  async create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const bgVideo = this.add.video(width / 2, height / 2, 'bg04_animated');
    bgVideo.play(true);
    bgVideo.setScale(0.45).setScrollFactor(0).setOrigin(0.5);

    this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

    const panelWidth = 1000;
    const panelHeight = 500;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a1a, 0.85);
    panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 25);
    panel.lineStyle(4, 0xd4af37, 1);
    panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 25);

    this.add.text(width / 2, panelY + 60, "Echoes of the Village", {
      fontFamily: "Georgia, serif",
      fontSize: "48px",
      color: "#ffffff",
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.displayAvatarInfo(width / 2 - 250, height / 2 + 40);
    this.createMenuButtons(width / 2 + 150, height / 2 + 40);

    this.statusText = this.add.text(width / 2, height / 2 + 200, '', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#d4af37'
    }).setOrigin(0.5);
  }

  displayAvatarInfo(x, y) {
    if (!this.userAvatar) return;
    
    const avatarY = y - 100;
    const avatarSize = 150;

    this.add.graphics()
      .lineStyle(3, 0xd4af37, 1)
      .strokeCircle(x, avatarY, avatarSize / 2 + 4);

    const avatarImage = this.add.image(x, avatarY, `mc_${this.userAvatar.avatarId}`)
      .setOrigin(0.5)
      .setDisplaySize(avatarSize, avatarSize);
    
    this.add.text(x, y, `Identity Selected`, {
      fontFamily: "Georgia, serif",
      fontSize: "24px",
      color: "#ffffff"
    }).setOrigin(0.5);

    const addressDisplay = this.account ? (this.account.substring(0, 6) + "..." + this.account.substring(this.account.length - 4)) : "Guest";
    this.add.text(x, y + 40, addressDisplay, {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#d4af37"
    }).setOrigin(0.5);
  }

  createMenuButtons(x, y) {
    const buttonSpacing = 80;
    
    this.createStyledButton(x, y - 80, "Start New Game", () => this.startGame('easy'));
    this.createStyledButton(x, y, "How to Play", () => alert("Uncover the village secrets. Talk to NPCs. Find the truth. Anchored on 0G."));
    this.createStyledButton(x, y + 80, "Leaderboard", () => alert("Coming soon to 0G."));
  }

  createStyledButton(x, y, text, callback) {
    const buttonWidth = 350;
    const buttonHeight = 60;
    const button = this.add.container(x, y);

    const bg = this.add.graphics()
      .fillStyle(0x333333, 1)
      .fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);

    const border = this.add.graphics()
      .lineStyle(2, 0xd4af37, 1)
      .strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);

    const txt = this.add.text(0, 0, text, {
      fontFamily: "Arial",
      fontSize: "24px",
      color: "#ffffff"
    }).setOrigin(0.5);

    button.add([bg, border, txt]);
    button.setSize(buttonWidth, buttonHeight);
    button.setInteractive({ useHandCursor: true });

    button.on("pointerover", () => {
      bg.clear().fillStyle(0x444444, 1).fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
      this.tweens.add({ targets: button, scale: 1.05, duration: 150 });
    });

    button.on("pointerout", () => {
      bg.clear().fillStyle(0x333333, 1).fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
      this.tweens.add({ targets: button, scale: 1, duration: 150 });
    });

    button.on("pointerdown", callback);
    return button;
  }

  async startGame(difficulty) {
    this.statusText.setText("Initializing journey on 0G...");
    const gameData = await startNewGame(difficulty);
    
    if (gameData) {
      this.scene.start("HomeScene", {
        account: this.account,
        signer: this.signer,
        provider: this.provider,
        gameData: gameData,
        userAvatar: this.userAvatar
      });
    } else {
      this.statusText.setText("Failed to start game. Check backend.");
    }
  }
}
