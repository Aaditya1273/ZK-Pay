import * as Phaser from "phaser";

export class AvatarScene extends Phaser.Scene {
  constructor() {
    super({ key: "AvatarScene" });
    this.provider = null;
    this.signer = null;
    this.account = null;
    this.selectedAvatarId = 1;
    this.previousSelectedBox = null;
  }

  init(data) {
    this.provider = data?.provider;
    this.signer = data?.signer;
    this.account = data?.account;
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

    this.showAvatarSelectionUI(width, height);
  }

  showAvatarSelectionUI(width, height) {
    const panelWidth = 1000;
    const panelHeight = 700;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.85);
    panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 30);
    panel.lineStyle(5, 0xd4af37, 1);
    panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 30);

    this.add.text(width / 2, panelY + 50, "Choose Your Avatar", {
      fontFamily: "Georgia, serif",
      fontSize: "48px",
      color: "#d4af37",
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, panelY + 105, "Select an identity for this journey", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#cccccc"
    }).setOrigin(0.5);

    const avatarSize = 120;
    const gridCenterX = width / 2;
    const gridStartY = panelY + 170;
    const spacingX = 160;
    const spacingY = 165;

    for (let i = 1; i <= 10; i++) {
      const row = Math.floor((i - 1) / 5);
      const col = (i - 1) % 5;
      const x = gridCenterX + (col - 2) * spacingX;
      const y = gridStartY + row * spacingY;

      const box = this.add.graphics();
      box.fillStyle(0x1a1a2e, 0.8);
      box.fillRoundedRect(x - avatarSize / 2, y - avatarSize / 2, avatarSize, avatarSize, 15);
      box.lineStyle(3, 0x666699, 1);
      box.strokeRoundedRect(x - avatarSize / 2, y - avatarSize / 2, avatarSize, avatarSize, 15);

      const avatarImage = this.add.image(x, y, `mc_${i}`)
        .setOrigin(0.5)
        .setDisplaySize(avatarSize - 20, avatarSize - 20)
        .setInteractive({ useHandCursor: true });

      avatarImage.on("pointerdown", () => this.selectAvatar(i, box, x, y, avatarSize));
      
      if (i === 1) this.selectAvatar(1, box, x, y, avatarSize);
    }

    const startButton = this.add.text(width / 2, panelY + panelHeight - 60, "Enter the Village", {
      fontFamily: "Georgia, serif",
      fontSize: "28px",
      color: "#000000",
      backgroundColor: "#d4af37",
      padding: { x: 40, y: 15 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startButton.on('pointerdown', () => this.startGame());
  }

  selectAvatar(avatarId, box, x, y, avatarSize) {
    if (this.previousSelectedBox) {
      this.previousSelectedBox.clear();
      this.previousSelectedBox.fillStyle(0x1a1a2e, 0.8);
      this.previousSelectedBox.fillRoundedRect(this.prevX - avatarSize / 2, this.prevY - avatarSize / 2, avatarSize, avatarSize, 15);
      this.previousSelectedBox.lineStyle(3, 0x666699, 1);
      this.previousSelectedBox.strokeRoundedRect(this.prevX - avatarSize / 2, this.prevY - avatarSize / 2, avatarSize, avatarSize, 15);
    }
    
    this.selectedAvatarId = avatarId;
    box.lineStyle(4, 0xd4af37, 1);
    box.strokeRoundedRect(x - avatarSize / 2, y - avatarSize / 2, avatarSize, avatarSize, 15);
    
    this.previousSelectedBox = box;
    this.prevX = x;
    this.prevY = y;
  }

  startGame() {
    this.scene.start("MenuScene", {
      provider: this.provider,
      signer: this.signer,
      account: this.account,
      userAvatar: { avatarId: this.selectedAvatarId }
    });
  }
}

