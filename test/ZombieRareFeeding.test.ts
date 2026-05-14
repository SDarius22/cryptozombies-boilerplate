import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ZombieOwnership, MockCryptoKitties } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ZombieRareFeeding (Feature 1)", function () {
  let zombieOwnership: ZombieOwnership;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const ZombieOwnershipFactory = await ethers.getContractFactory("ZombieOwnership");
    zombieOwnership = (await ZombieOwnershipFactory.deploy()) as unknown as ZombieOwnership;
    await zombieOwnership.connect(owner).createRandomZombie("RareHunter");
    await zombieOwnership.connect(addr1).createRandomZombie("Defender");
    await time.increase(86400);
  });

  describe("feedOnRare", function () {
    it("Should level up the zombie by 2 when feeding on a rare creature", async function () {
      const zombieBefore = await zombieOwnership.zombies(0);
      await zombieOwnership.feedOnRare(0);
      const zombieAfter = await zombieOwnership.zombies(0);
      expect(zombieAfter.level).to.equal(zombieBefore.level + 2n);
    });

    it("Should NOT spawn a child zombie (pure level-up event)", async function () {
      const zombiesBefore = await zombieOwnership.getZombiesByOwner(owner.address);
      expect(zombiesBefore.length).to.equal(1);
      await zombieOwnership.feedOnRare(0);
      const zombiesAfter = await zombieOwnership.getZombiesByOwner(owner.address);
      expect(zombiesAfter.length).to.equal(1);
    });

    it("Should leave the parent zombie's DNA unchanged", async function () {
      const dnaBefore = (await zombieOwnership.zombies(0)).dna;
      await zombieOwnership.feedOnRare(0);
      const dnaAfter = (await zombieOwnership.zombies(0)).dna;
      expect(dnaAfter).to.equal(dnaBefore);
    });

    it("Should emit RareFeedBonus event with correct zombieId and newLevel", async function () {
      const zombieBefore = await zombieOwnership.zombies(0);
      const expectedNewLevel = zombieBefore.level + 2n;
      await expect(zombieOwnership.feedOnRare(0))
        .to.emit(zombieOwnership, "RareFeedBonus")
        .withArgs(0n, expectedNewLevel);
    });

    it("Should trigger cooldown after rare feeding", async function () {
      await zombieOwnership.feedOnRare(0);
      const zombie = await zombieOwnership.zombies(0);
      const currentTime = await time.latest();
      expect(zombie.readyTime).to.be.gt(currentTime);
    });

    it("Should not allow feeding before cooldown expires", async function () {
      const ZombieOwnershipFactory = await ethers.getContractFactory("ZombieOwnership");
      const freshContract = (await ZombieOwnershipFactory.deploy()) as unknown as ZombieOwnership;
      await freshContract.createRandomZombie("FreshZombie");
      await expect(freshContract.feedOnRare(0)).to.be.reverted;
    });

    it("Should only allow the zombie owner to feed on rare", async function () {
      await expect(zombieOwnership.connect(addr1).feedOnRare(0)).to.be.reverted;
    });

    it("Rare feeding gives more levels than kitty feeding", async function () {
      const ZombieOwnershipFactory = await ethers.getContractFactory("ZombieOwnership");
      const mockKittyFactory = await ethers.getContractFactory("MockCryptoKitties");
      const rareContract = (await ZombieOwnershipFactory.deploy()) as unknown as ZombieOwnership;
      const kittyContract = (await ZombieOwnershipFactory.deploy()) as unknown as ZombieOwnership;
      const mockKitty = await mockKittyFactory.deploy();
      await rareContract.connect(owner).createRandomZombie("RareZombie");
      await kittyContract.connect(owner).createRandomZombie("KittyZombie");
      await kittyContract.setKittyContractAddress(await mockKitty.getAddress());
      await time.increase(86400);
      const rareBefore = await rareContract.zombies(0);
      const kittyBefore = await kittyContract.zombies(0);
      await rareContract.feedOnRare(0);
      await kittyContract.feedOnKitty(0, 1);
      const rareAfter = await rareContract.zombies(0);
      const kittyAfter = await kittyContract.zombies(0);
      const rareLevelGain = Number(rareAfter.level) - Number(rareBefore.level);
      const kittyLevelGain = Number(kittyAfter.level) - Number(kittyBefore.level);
      expect(rareLevelGain).to.be.gt(kittyLevelGain);
    });
  });
});
