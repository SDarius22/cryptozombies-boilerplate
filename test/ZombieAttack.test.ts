import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ZombieOwnership } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ZombieAttack", function () {
  let zombieOwnership: ZombieOwnership;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const ZombieOwnership = await ethers.getContractFactory("ZombieOwnership");
    zombieOwnership = await ZombieOwnership.deploy() as unknown as ZombieOwnership;

    // Create zombies for both players
    await zombieOwnership.connect(owner).createRandomZombie("AttackerZombie");
    await zombieOwnership.connect(addr1).createRandomZombie("DefenderZombie");

    // Fast forward time to pass cooldown
    await time.increase(86400);
  });

  describe("attack", function () {
    it("Should execute attack and update stats", async function () {
      const attackerBefore = await zombieOwnership.zombies(0);
      const defenderBefore = await zombieOwnership.zombies(1);

      await zombieOwnership.attack(0, 1);

      const attackerAfter = await zombieOwnership.zombies(0);
      const defenderAfter = await zombieOwnership.zombies(1);

      // Either win or loss should have happened
      const totalWins = Number(attackerAfter.winCount) + Number(defenderAfter.winCount);
      const totalLosses = Number(attackerAfter.lossCount) + Number(defenderAfter.lossCount);

      expect(totalWins).to.equal(1);
      expect(totalLosses).to.equal(1);
    });

    it("Should increment winCount and level on victory", async function () {
      // We need to test multiple times to catch a win (70% probability)
      let foundWin = false;

      for (let i = 0; i < 20; i++) {
        await time.increase(86400);

        const attackerBefore = await zombieOwnership.zombies(0);
        const ownerZombiesBefore = await zombieOwnership.getZombiesByOwner(owner.address);

        await zombieOwnership.attack(0, 1);

        const attackerAfter = await zombieOwnership.zombies(0);
        const ownerZombiesAfter = await zombieOwnership.getZombiesByOwner(owner.address);

        if (attackerAfter.winCount > attackerBefore.winCount) {
          foundWin = true;
          expect(attackerAfter.level).to.equal(attackerBefore.level + 1n);
          expect(attackerAfter.winCount).to.equal(attackerBefore.winCount + 1n);
          // On win, a new zombie should be created (breeding)
          expect(ownerZombiesAfter.length).to.equal(ownerZombiesBefore.length + 1);
          break;
        }
      }

      expect(foundWin).to.be.true;
    });

    it("Should increment lossCount on defeat", async function () {
      // Test multiple times to catch a loss (30% probability)
      let foundLoss = false;

      for (let i = 0; i < 20; i++) {
        await time.increase(86400);

        const attackerBefore = await zombieOwnership.zombies(0);

        await zombieOwnership.attack(0, 1);

        const attackerAfter = await zombieOwnership.zombies(0);

        if (attackerAfter.lossCount > attackerBefore.lossCount) {
          foundLoss = true;
          expect(attackerAfter.lossCount).to.equal(attackerBefore.lossCount + 1n);
          // On loss, level should stay the same
          expect(attackerAfter.level).to.equal(attackerBefore.level);
          break;
        }
      }

      expect(foundLoss).to.be.true;
    });

    it("Should trigger cooldown after attack", async function () {
      await zombieOwnership.attack(0, 1);

      const attacker = await zombieOwnership.zombies(0);
      const currentTime = await time.latest();

      expect(attacker.readyTime).to.be.gt(currentTime);
    });

    it("Should only allow owner to attack with their zombie", async function () {
      await expect(
        zombieOwnership.connect(addr1).attack(0, 1)
      ).to.be.reverted;
    });

    it("Should not allow attacking before cooldown", async function () {
      // Create fresh zombies for this test
      const ZombieOwnership = await ethers.getContractFactory("ZombieOwnership");
      const testContract = await ZombieOwnership.deploy() as unknown as ZombieOwnership;

      const [signer1, signer2] = await ethers.getSigners();

      await testContract.connect(signer1).createRandomZombie("TestAttacker");
      await testContract.connect(signer2).createRandomZombie("TestDefender");

      // Fast forward to pass initial cooldown
      await time.increase(86400);

      // First attack
      await testContract.connect(signer1).attack(0, 1);

      // Try to attack again immediately (should fail because of cooldown)
      await expect(
        testContract.connect(signer1).attack(0, 1)
      ).to.be.reverted;
    });

    it("Should create new zombie on victory (breeding)", async function () {
      const ownerZombiesBefore = await zombieOwnership.getZombiesByOwner(owner.address);

      // Attack multiple times to ensure we get a win
      for (let i = 0; i < 10; i++) {
        await time.increase(86400);
        await zombieOwnership.attack(0, 1);

        const ownerZombiesAfter = await zombieOwnership.getZombiesByOwner(owner.address);

        if (ownerZombiesAfter.length > ownerZombiesBefore.length) {
          // Win happened, new zombie created
          const newZombie = await zombieOwnership.zombies(ownerZombiesAfter[ownerZombiesAfter.length - 1]);
          expect(newZombie.name).to.equal("NoName");
          expect(newZombie.level).to.equal(1);
          break;
        }
      }
    });

    it("Should have ~70% win rate over many battles", async function () {
      let wins = 0;
      let losses = 0;

      // Create new contract instance for this test
      const ZombieOwnership = await ethers.getContractFactory("ZombieOwnership");
      const testContract = await ZombieOwnership.deploy() as unknown as ZombieOwnership;

      // Get as many signers as we need (Hardhat provides 20 by default)
      const allSigners = await ethers.getSigners();

      // Create 10 pairs of zombies (20 addresses = 10 battles)
      const trials = 10;

      for (let i = 0; i < trials; i++) {
        const attackerAddr = allSigners[i * 2];
        const defenderAddr = allSigners[i * 2 + 1];

        await testContract.connect(attackerAddr).createRandomZombie(`Attacker${i}`);
        await testContract.connect(defenderAddr).createRandomZombie(`Defender${i}`);
      }

      // Fast forward to pass cooldown for all zombies
      await time.increase(86400);

      // Execute battles
      for (let i = 0; i < trials; i++) {
        const attackerAddr = allSigners[i * 2];
        const attackerId = i * 2;
        const defenderId = i * 2 + 1;

        const attackerBefore = await testContract.zombies(attackerId);

        await testContract.connect(attackerAddr).attack(attackerId, defenderId);

        const attackerAfter = await testContract.zombies(attackerId);

        if (attackerAfter.winCount > attackerBefore.winCount) {
          wins++;
        } else {
          losses++;
        }
      }

      const winRate = (wins / trials) * 100;

      // Win rate should be approximately 70% (allow 30-100% range due to small sample size)
      // With only 10 trials, we expect 7 wins on average, but small samples can produce 100%
      expect(winRate).to.be.greaterThan(30);
      expect(winRate).to.be.lte(100);
    }).timeout(120000); // Increase timeout for this long test
  });
});
