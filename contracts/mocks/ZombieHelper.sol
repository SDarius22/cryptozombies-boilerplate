// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ZombieFeeding.sol";

contract ZombieHelper is ZombieFeeding {

  uint256 levelUpFee = 0.001 ether;
  uint256 fireballFee   = 0.01 ether;
  uint256 iceShieldFee  = 1 ether;
  uint256 poisonClawFee = 0.05 ether;

  event SpecialSkillBought(uint256 indexed zombieId, uint8 skillId);
  event SkillFeeChanged(uint8 indexed skillId, uint256 newFee);

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

  function getSkillFee(uint8 _skillId) public view returns (uint256) {
    if (_skillId == 1) return fireballFee;
    if (_skillId == 2) return iceShieldFee;
    if (_skillId == 3) return poisonClawFee;
    revert("Invalid skill ID (1-3)");
  }

  function setSkillFee(uint8 _skillId, uint256 _fee) external onlyOwner {
    if (_skillId == 1) fireballFee = _fee;
    else if (_skillId == 2) iceShieldFee = _fee;
    else if (_skillId == 3) poisonClawFee = _fee;
    else revert("Invalid skill ID (1-3)");
    emit SkillFeeChanged(_skillId, _fee);
  }

  function levelUp(uint256 _zombieId) external payable {
    require(msg.value == levelUpFee);
    zombies[_zombieId].level++;
  }

  function buySpecialSkill(uint256 _zombieId, uint8 _skillId) external payable onlyOwnerOf(_zombieId) {
    require(_skillId >= 1 && _skillId <= 3, "Invalid skill ID (1-3)");
    require(msg.value == getSkillFee(_skillId), "Incorrect ETH amount");
    zombies[_zombieId].specialSkill = _skillId;
    emit SpecialSkillBought(_zombieId, _skillId);
  }

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
