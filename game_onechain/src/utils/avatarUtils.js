export class AvatarUtils {
  static async getUserAvatar(provider, account) {
    // In the new 0G/EVM flow, we pass avatar data through scenes
    // but we can also store it in localStorage for persistence.
    const saved = localStorage.getItem(`avatar_${account}`);
    if (saved) return JSON.parse(saved);
    return null;
  }

  static saveUserAvatar(account, avatarData) {
    localStorage.setItem(`avatar_${account}`, JSON.stringify(avatarData));
  }

  static getAvatarImageKey(avatarId) {
    return `mc_${avatarId}`;
  }

  static getAvatarDisplayName(avatarId) {
    return `Identity #${avatarId}`;
  }
}
