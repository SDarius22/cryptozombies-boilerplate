import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ZombieOwnership } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ZombieSpecialSkill (Feature 2)", function () {
  let zombieOwnership: ZombieOwnership;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;

  const SKILL_FEE = ethers.parseEther("0.01");
  const FIREBALL = 1;
  const ICE_SHIELD = 2;
  const POISON_CLAW = 3;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const ZombieOwnershipFactory = await ethers.getContractFactory("ZombieOwnership");
    zombieOwnership = (await ZombieOwnershipFactory.deploy()) as unknown as ZombieOwnership;
    await zombieOwnership.connect(owner).createRandomZombie("SkillZombie");
    await zombieOwnership.connect(addr1).createRandomZombie("EnemyZombie");
  });

  describe("buySpecialSkill", function () {
    it("Should assign Fireball (skill 1) after paying the fee", async function () {
      await zombieOwnership.buySpecialSkill(0, FIREBALL, { value: SKILL_FEE });
      const zombie = await zombieOwnership.zombies(0);
      expect(zombie.specialSkill).to.equal(FIREBALL);
    });

    it("Should assign IceShield (skill 2) after paying the fee", async function () {
      await zombieOwnership.buySpecialSkill(0, ICE_SHIELD, { value: SKILL_FEE });
      const zombie = await zombieOwnership.zombies(0);
      expect(zombie.specialSkill).to.equal(ICE_SHIELD);
    });

    it("Should assign PoisonClaw (skill 3) after paying the fee", async function () {
      await zombieOwnership.buySpecialSkill(0, POISON_CLAW, { value: SKILL_FEE });
      const zombie = await zombieOwnership.zombies(0);
      expect(zombie.specialSkill).to.equal(POISON_CLAW);
    });

    it("Should emit SpecialSkillBought event", async function () {
      await expect(zombieOwnership.buySpecialSkill(0, FIREBALL, { value: SKILL_FEE }))
        .to.emit(zombieOwnership, "SpecialSkillBought")
        .withArgs(0n, FIREBALL);
    });

    it("Should revert if incorrect ETH amount is sent", async function () {
      await expect(
        zombieOwnership.buySpecialSkill(0, FIREBALL, { value: ethers.parseEther("0.005") })
      ).to.be.revertedWith("Incorrect ETH amount");
    });

    it("Should revert if no ETH is sent", async function () {
      await expect(zombieOwnership.buySpecialSkill(0, FIREBALL)).to.be.reverted;
    });

    it("Should revert for invalid skill ID 0", async function () {
      await expect(
        zombieOwnership.buySpecialSkill(0, 0, { value: SKILL_FEE })
      ).to.be.revertedWith("Invalid skill ID (1-3)");
    });

    it("Should revert for invalid skill ID > 3", async function () {
      await expect(
        zombieOwnership.buySpecialSkill(0, 4, { value: SKILL_FEE })
      ).to.be.revertedWith("Invalid skill ID (1-3)");
    });

    it("Should not allow non-owner to buy skill for a zombie", async function () {
      await expect(
        zombieOwnership.connect(addr1).buySpecialSkill(0, FIREBALL, { value: SKILL_FEE })
      ).to.be.reverted;
    });

    it("Should allow replacing an existing skill", async function () {
      await zombieOwnership.buySpecialSkill(0, FIREBALL, { value: SKILL_FEE });
      await zombieOwnership.buySpecialSkill(0, ICE_SHIELD, { value: SKILL_FEE });
      const zombie = await zombieOwnership.zombies(0);
      expect(zombie.specialSkill).to.equal(ICE_SHIELD);
    });
  });

  describe("setSpecialSkillFee", function () {
    it("Should allow owner to change the special skill fee", async function () {
      const newFee = ethers.parseEther("0.02");
      await zombieOwnership.setSpecialSkillFee(newFee);
      await expect(
        zombieOwnership.buySpecialSkill(0, FIREBALL, { value: SKILL_FEE })
      ).to.be.revertedWith("Incorrect ETH amount");
      await zombieOwnership.buySpecialSkill(0, FIREBALL, { value: newFee });
      const zombie = await zombieOwnership.zombies(0);
      expect(zombie.specialSkill).to.equal(FIREBALL);
    });

    it("Should not allow non-owner to change the fee", async function () {
      await expect(
        zombieOwnership.connect(addr1).setSpecialSkillFee(ethers.parseEther("0.02"))
      ).to.be.reverted;
    });
  });

  describe("getSpecialSkillName", function () {
    it("Should return Fireball for skill 1", async function () {
      expect(await zombieOwnership.getSpecialSkillName(1)).to.equal("Fireball");
    });
    it("Should return IceShield for skill 2", async function () {
      expect(await zombieOwnership.getSpecialSkillName(2)).to.equal("IceShield");
    });
    it("Should return PoisonClaw for skill 3", async function () {
      expect(await zombieOwnership.getSpecialSkillName(3)).to.equal("PoisonClaw");
    });
    it("Should return None for skill 0", async function () {
      expect(await zombieOwnership.getSpecialSkillName(0)).to.equal("None");
    });
  });

  describe("Skill effects in ZombieAttack", function () {
    it("Fireball zombie should win at least once over 10 rounds", async function () {
      const ZombieOwnershipFactory = await ethers.getContractFactory("ZombieOwnership");
      const testContract = (await ZombieOwnershipFactory.deploy()) as unknown as ZombieOwnership;
      const allSigners = await ethers.getSigners();
      await testContract.connect(allSigners[0]).createRandomZombie("FireAttacker");
      await testContract.connect(allSigners[1]).createRandomZombie("FireDefender");
      await testContract.connect(allSigners[0]).buySpecialSkill(0, FIREBALL, { value: SKILL_FEE });
      await time.increase(86400);
      let fireballWins = 0;
      for (let i = 0; i < 10; i++) {
        await time.increase(86400);
        const before = await testContract.zombies(0);
        await testContract.connect(allSigners[0]).attack(0, 1);
        const after = await testContract.zombies(0);
        if (after.winCount > before.winCount) fireballWins++;
      }
      expect(fireballWins).to.be.greaterThan(0);
    }).timeout(120000);

    it("PoisonClaw should reduce enemy level on victory", async function () {
      const ZombieOwnershipFactory = await ethers.getContractFactory("ZombieOwnership");
      const testContract = (await ZombieOwnershipFactory.deploy()) as unknown as ZombieOwnership;
      const allSigners = await ethers.getSigners();
      await testContract.connect(allSigners[0]).createRandomZombie("PoisonAttacker");
      await testContract.connect(allSigners[1]).createRandomZombie("PoisonDefender");
      await testContract.connect(allSigners[0]).buySpecialSkill(0, POISON_CLAW, { value: SKILL_FEE });
      await testContract.connect(allSigners[0]).levelUp(1, { value: ethers.parseEther("0.001") });
      await time.increase(86400);
      let foundPoisonEffect = false;
      for (let i = 0; i < 20; i++) {
        await time.increase(86400);
        const attackerBefore = await testContract.zombies(0);
        const defenderBefore = await testContract.zombies(1);
        await testContract.connect(allSigners[0]).attack(0, 1);
        const attackerAfter = await testContract.zombies(0);
        const defenderAfter = await testContract.zombies(1);
        if (attackerAfter.winCount > attackerBefore.winCount) {
          expect(defenderAfter.level).to.be.lte(defenderBefore.level);
          if (defenderAfter.level < defenderBefore.level) foundPoisonEffect = true;
          break;
        }
      }
      expect(foundPoisonEffect).to.be.true;
    }).timeout(120000);

    it("IceShield defender: battle executes and stats are recorded", async function () {
      const ZombieOwnershipFactory = await ethers.getContractFactory("ZombieOwnership");
      const testContract = (await ZombieOwnershipFactory.deploy()) as unknown as ZombieOwnership;
      const allSigners = await ethers.getSigners();
      await testContract.connect(allSigners[0]).createRandomZombie("Attacker");
      await testContract.connect(allSigners[1]).createRandomZombie("IceDefender");
      await testContract.connect(allSigners[1]).buySpecialSkill(1, ICE_SHIELD, { value: SKILL_FEE });
      const defenderZombie = await testContract.zombies(1);
      expect(defenderZombie.specialSkill).to.equal(ICE_SHIELD);
      await time.increase(86400);
      await testContract.connect(allSigners[0]).attack(0, 1);
      const attacker = await testContract.zombies(0);
      const defender = await testContract.zombies(1);
      const totalStats = Number(attacker.winCount) + Number(attacker.lossCount) +
                         Number(defender.winCount) + Number(defender.lossCount);
      expect(totalStats).to.equal(2);
    });
  });

  describe("Withdraw includes skill fee revenue", function () {
    it("Owner should be able to withdraw skill fee payments", async function () {
      await zombieOwnership.buySpecialSkill(0, FIREBALL, { value: SKILL_FEE });
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await zombieOwnership.withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter).to.be.closeTo(
        ownerBalanceBefore + SKILL_FEE - gasUsed,
        ethers.parseEther("0.0001")
      );
    });
  });
});
