import * as Phaser from "phaser";
import { ethers } from "ethers";
import { pingServer } from "../api";
import { 
  CHAIN_ID, 
  RPC_URL, 
  USER_REGISTRY_ADDRESS, 
  USER_REGISTRY_ABI 
} from "../contractConfig";

export class WalletScene extends Phaser.Scene {
  constructor() {
    super({ key: "WalletScene" });
    this.userAddress = null;
    this.provider = null;
    this.signer = null;
  }

  preload() {
    this.load.video("bg_video", "assets/cut-scene/bg04_animated.mp4", "loadeddata", false, true);
    this.load.audio("intro_music", "assets/music/intro_music.MP3");
    this.load.image("gaming_frame", "assets/images/ui/gaming_frame.png");
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
    
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    const bgVideo = this.add.video(centerX, centerY, "bg_video");
    bgVideo.play(true);
    bgVideo.setScale(0.45).setScrollFactor(0).setOrigin(0.5);
    
    this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7).setOrigin(0);

    const panelWidth = 500;
    const panelHeight = 400;
    this.add.graphics()
      .fillStyle(0x1a1a1a, 0.9)
      .fillRoundedRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 20)
      .lineStyle(2, 0xd4af37, 1)
      .strokeRoundedRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 20);

    this.add.text(centerX, centerY - 120, "Connect Your Wallet", {
      fontFamily: "Georgia, serif",
      fontSize: "40px",
      color: "#ffffff",
      align: "center"
    }).setOrigin(0.5);

    this.createButton(centerX, centerY + 20, 'Connect MetaMask', () => this.connectWallet());
  }

  createButton(x, y, text, callback) {
    const buttonWidth = 320;
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

  async connectWallet() {
    pingServer();
    if (!window.ethereum) {
      alert("MetaMask not found! Please install MetaMask to play.");
      return;
    }

    try {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request accounts
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      this.userAddress = accounts[0];
      this.signer = await this.provider.getSigner();

      // Switch to 0G Galileo Testnet
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: CHAIN_ID }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: CHAIN_ID,
              chainName: '0G Galileo Testnet',
              nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
              rpcUrls: [RPC_URL],
              blockExplorerUrls: ['https://chainscan-galileo.0g.ai']
            }],
          });
        }
      }

      console.log("Connected to 0G:", this.userAddress);
      await this.handleUserRegistration();

    } catch (error) {
      console.error("Connection failed:", error);
      alert("Failed to connect wallet: " + error.message);
    }
  }

  async handleUserRegistration() {
    try {
      const contract = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, this.signer);
      const isRegistered = await contract.isUserRegistered(this.userAddress);

      if (isRegistered) {
        console.log("User already registered.");
        this.proceedToGame();
      } else {
        console.log("Registering user on 0G...");
        const tx = await contract.registerUser();
        await tx.wait();
        console.log("Registration successful!");
        this.proceedToGame();
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("Registration failed. Please ensure you have testnet 0G tokens.");
    }
  }

  proceedToGame() {
    this.scene.start('AvatarScene', { 
      account: this.userAddress,
      provider: this.provider,
      signer: this.signer
    });
  }
}