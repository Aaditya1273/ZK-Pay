'use client';
import React, { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { WalletScene } from "../scenes/WalletScene.js";
import { MenuScene } from "../scenes/MenuScene.js";
import { LoadingScene } from "../scenes/LoadingScene.js";
import { HomeScene } from "../scenes/HomeScene.js";
import { LeaderboardScene } from "../scenes/LeaderboardScene.js";
import { DialogueScene } from "../scenes/DialogueScene.js";
import { VideoScene } from "../scenes/VideoScene.js";
import { UIScene } from "../scenes/UIScene.js";
import { ItemLockScene } from "../scenes/ItemLockScene.js";
import { InventoryScene } from "../scenes/InventoryScene.js";
import { EndScene } from "../scenes/EndScene.js";
import { AvatarScene } from '../scenes/AvatarScene.js';

const PhaserGame = () => {
    const gameRef = useRef(null);

    useEffect(() => {
        if (gameRef.current) {
            const config = {
                type: Phaser.AUTO,
                parent: 'game-container', // This ID must match the div below
                width: 1280,
                height: 720,
                scale: {
                    mode: Phaser.Scale.FIT,
                    autoCenter: Phaser.Scale.CENTER_BOTH,
                },
                physics: {
                    default: "arcade",
                    arcade: {
                        gravity: { y: 0 },
                        debug: false,
                    },
                },
                scene: [
                    WalletScene, MenuScene, LoadingScene, VideoScene, HomeScene, 
                    UIScene, DialogueScene, InventoryScene, ItemLockScene, 
                    LeaderboardScene, EndScene , AvatarScene
                ],
            };

            const game = new Phaser.Game(config);

            return () => {
                game.destroy(true);
            };
        }
    }, []);

    return <div id="game-container" ref={gameRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default PhaserGame;