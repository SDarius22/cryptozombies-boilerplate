// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ZombieHelper.sol";

contract ZombieAttack is ZombieHelper {
  uint256 randNonce = 0;
  uint256 attackVictoryProbability = 70;

  function randMod(uint256 _modulus) internal returns(uint256) {
    randNonce++;
    return uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, randNonce))) % _modulus;
  }

  function attack(uint256 _zombieId, uint256 _targetId) external onlyOwnerOf(_zombieId) {
    Zombie storage myZombie = zombies[_zombieId];
    require(_isReady(myZombie), "Zombie not ready to attack");
    Zombie storage enemyZombie = zombies[_targetId];

    // Base probability
    uint256 victoryProbability = attackVictoryProbability;

    // Skill 1 (Fireball): +10% attack probability
    if (myZombie.specialSkill == 1) {
      victoryProbability += 10;
    }
    // Skill 2 (IceShield): defending zombie reduces attacker probability by 10%
    if (enemyZombie.specialSkill == 2) {
      victoryProbability = victoryProbability > 10 ? victoryProbability - 10 : 0;
    }

    uint256 rand = randMod(100);
    if (rand <= victoryProbability) {
      myZombie.winCount++;
      myZombie.level++;
      enemyZombie.lossCount++;
      // Skill 3 (PoisonClaw): enemy loses a level on defeat
      if (myZombie.specialSkill == 3 && enemyZombie.level > 1) {
        enemyZombie.level--;
      }
      feedAndMultiply(_zombieId, enemyZombie.dna, "zombie");
    } else {
      myZombie.lossCount++;
      enemyZombie.winCount++;
      _triggerCooldown(myZombie);
    }
  }
}
