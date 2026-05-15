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
  }

  create() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Background Video
    const bgVideo = this.add.video(centerX, centerY, "bg_video");
    
    const playVideo = () => {
      if (this.scene.isActive()) {
        bgVideo.play(true);
        if (bgVideo.video) {
          bgVideo.video.play().catch(err => {
            if (err.name !== 'AbortError') console.warn("Video play error:", err);
          });
        }
      }
    };
    playVideo();

    bgVideo.setScale(0.5).setScrollFactor(0).setOrigin(0.5);
    
    // Darker Overlay for cinematic feel
    this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.8).setOrigin(0);

    // Glass Panel Effect
    const panelWidth = 600;
    const panelHeight = 450;
    const graphics = this.add.graphics();
    
    // Outer Glow
    graphics.lineStyle(1, 0x2dd4bf, 0.2);
    graphics.strokeRoundedRect(centerX - panelWidth / 2 - 10, centerY - panelHeight / 2 - 10, panelWidth + 20, panelHeight + 20, 30);

    // Main Panel
    graphics.fillStyle(0x050505, 0.95);
    graphics.fillRoundedRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 25);
    
    // Teal Border
    graphics.lineStyle(2, 0x2dd4bf, 0.5);
    graphics.strokeRoundedRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 25);

    // Title using Cinzel
    this.add.text(centerX, centerY - 140, "INITIALIZE IDENTITY", {
      fontFamily: "Cinzel",
      fontSize: "42px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
      letterSpacing: 6
    }).setOrigin(0.5);

    this.add.text(centerX, centerY - 80, "PROTOCOL: 0G NEWTON TESTNET", {
      fontFamily: "Inter",
      fontSize: "12px",
      color: "#2dd4bf",
      letterSpacing: 4
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(centerX, centerY - 20, "Your journey is anchored by decentralized consensus.", {
      fontFamily: "Inter",
      fontSize: "16px",
      color: "#888888",
      align: "center"
    }).setOrigin(0.5);

    this.createButton(centerX, centerY + 80, 'CONNECT METAMASK', () => this.connectWallet());
    
    // Version Text
    this.add.text(centerX, centerY + 180, "VER. 1.0.4-PROD", {
      fontFamily: "Inter",
      fontSize: "10px",
      color: "#333333",
      letterSpacing: 2
    }).setOrigin(0.5);
  }

  createButton(x, y, text, callback) {
    const buttonWidth = 360;
    const buttonHeight = 70;
    const button = this.add.container(x, y);

    const bg = this.add.graphics()
      .fillStyle(0x2dd4bf, 1)
      .fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 35);

    const txt = this.add.text(0, 0, text, {
      fontFamily: "Cinzel",
      fontSize: "20px",
      color: "#050505",
      fontStyle: "bold",
      letterSpacing: 2
    }).setOrigin(0.5);

    button.add([bg, txt]);
    button.setSize(buttonWidth, buttonHeight);
    button.setInteractive({ useHandCursor: true });

    button.on("pointerover", () => {
      if (!this.scene.isActive()) return;
      bg.clear().fillStyle(0xffffff, 1).fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 35);
      if (this.tweens) this.tweens.add({ targets: button, scale: 1.05, duration: 150 });
    });

    button.on("pointerout", () => {
      if (!this.scene.isActive()) return;
      bg.clear().fillStyle(0x2dd4bf, 1).fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 35);
      if (this.tweens) this.tweens.add({ targets: button, scale: 1, duration: 150 });
    });

    button.on("pointerdown", () => {
      if (this.scene.isActive()) callback();
    });
    return button;
  }

  async connectWallet() {
    pingServer();
    if (!window.ethereum) {
      alert("METAMASK NOT DETECTED. PLEASE INSTALL TO PROCEED.");
      return;
    }

    try {
      this.provider = new ethers.BrowserProvider(window.ethereum);
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

      console.log("AUTHORIZED IDENTITY:", this.userAddress);
      await this.handleUserRegistration();

    } catch (error) {
      console.error("IDENTITY VALIDATION FAILED:", error);
      alert("FAILED TO CONNECT: " + error.message);
    }
  }

  async handleUserRegistration() {
    try {
      const contract = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, this.signer);
      const isRegistered = await contract.isUserRegistered(this.userAddress);

      if (isRegistered) {
        this.proceedToGame();
      } else {
        const tx = await contract.registerUser();
        await tx.wait();
        this.proceedToGame();
      }
    } catch (error) {
      console.error("REGISTRATION PROTOCOL FAILED:", error);
      alert("REGISTRATION FAILED. ENSURE YOU HAVE TESTNET 0G TOKENS.");
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