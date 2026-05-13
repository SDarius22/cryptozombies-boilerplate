// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ZombieFeeding.sol";

contract ZombieHelper is ZombieFeeding {

  uint256 levelUpFee = 0.001 ether;
  uint256 specialSkillFee = 0.01 ether;

  // Special skills: 1=Fireball (+10% attack), 2=IceShield (-10% enemy attack), 3=PoisonClaw (enemy loses level on defeat)
  event SpecialSkillBought(uint256 indexed zombieId, uint8 skillId);

  modifier aboveLevel(uint256 _level, uint256 _zombieId) {
    require(zombies[_zombieId].level >= _level);
    _;
  }

  function withdraw() external onlyOwner {
    address payable _owner = payable(owner());
    (bool success, ) = _owner.call{value: address(this).balance}("");
    require(success, "Transfer failed");
  }

  function setLevelUpFee(uint256 _fee) external onlyOwner {
    levelUpFee = _fee;
  }

  function setSpecialSkillFee(uint256 _fee) external onlyOwner {
    specialSkillFee = _fee;
  }

  function levelUp(uint256 _zombieId) external payable {
    require(msg.value == levelUpFee);
    zombies[_zombieId].level++;
  }

  /// @notice Buy a special skill for your zombie.
  /// Skill 1 = Fireball: +10% attack victory probability.
  /// Skill 2 = IceShield: reduces enemy attack probability by 10%.
  /// Skill 3 = PoisonClaw: on victory the enemy zombie loses a level.
  function buySpecialSkill(uint256 _zombieId, uint8 _skillId) external payable onlyOwnerOf(_zombieId) {
    require(_skillId >= 1 && _skillId <= 3, "Invalid skill ID (1-3)");
    require(msg.value == specialSkillFee, "Incorrect ETH amount");
    zombies[_zombieId].specialSkill = _skillId;
    emit SpecialSkillBought(_zombieId, _skillId);
  }

  /// @notice Returns the name of a special skill by ID.
  function getSpecialSkillName(uint8 _skillId) public pure returns (string memory) {
    if (_skillId == 1) return "Fireball";
    if (_skillId == 2) return "IceShield";
    if (_skillId == 3) return "PoisonClaw";
    return "None";
  }

  function changeName(uint256 _zombieId, string calldata _newName) external aboveLevel(2, _zombieId) onlyOwnerOf(_zombieId) {
    zombies[_zombieId].name = _newName;
  }

  function changeDna(uint256 _zombieId, uint256 _newDna) external aboveLevel(20, _zombieId) onlyOwnerOf(_zombieId) {
    zombies[_zombieId].dna = _newDna;
  }

  function getZombiesByOwner(address _owner) external view returns(uint256[] memory) {
    uint256[] memory result = new uint256[](ownerZombieCount[_owner]);
    uint256 counter = 0;
    for (uint256 i = 0; i < zombies.length; i++) {
      if (zombieToOwner[i] == _owner) {
        result[counter] = i;
        counter++;
      }
    }
    return result;
  }

}
