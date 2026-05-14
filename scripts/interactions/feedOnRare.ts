import { ethers } from "hardhat";
import { ZombieOwnership } from "../../typechain-types";

/**
 * Feature 1: Hunt a rare creature for a +2 level bonus.
 *
 * Unlike kitty feeding, this is a *pure* level-up event:
 *   - The zombie's level goes up by 2.
 *   - No child zombie is spawned and the parent's DNA is unchanged.
 *   - The zombie goes on cooldown for 1 day, same as kitty feeding.
 *
 * Usage:
 *   ZOMBIE_ID=0 npm run interact:feedrare
 *
 * Or with a custom contract address:
 *   CONTRACT_ADDRESS=0x... ZOMBIE_ID=0 npm run interact:feedrare
 */

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const zombieIdStr = process.env.ZOMBIE_ID;

  if (!zombieIdStr) {
    console.error("Error: ZOMBIE_ID environment variable not set");
    console.log("\nUsage: ZOMBIE_ID=0 npm run interact:feedrare");
    process.exit(1);
  }

  const zombieId = parseInt(zombieIdStr);

  console.log("Rare Feeding (Feature 1)\n");
  console.log("Contract address:", contractAddress);
  console.log("Zombie ID:", zombieId);

  const [signer] = await ethers.getSigners();
  console.log("Using account:", signer.address);

  const contract = await ethers.getContractAt(
    "ZombieOwnership",
    contractAddress
  ) as unknown as ZombieOwnership;

  const zombieBefore = await contract.zombies(zombieId);
  console.log("\nZombie before feeding:");
  console.log("  Name:", zombieBefore.name);
  console.log("  Level:", zombieBefore.level.toString());
  console.log("  DNA:", zombieBefore.dna.toString());

  console.log("\nFeeding on rare creature...");
  const tx = await contract.feedOnRare(zombieId);
  console.log("Transaction hash:", tx.hash);
  await tx.wait();
  console.log("Transaction confirmed!");

  const zombieAfter = await contract.zombies(zombieId);
  const levelGain = Number(zombieAfter.level) - Number(zombieBefore.level);
  console.log("\nRare feeding successful!");
  console.log("Zombie after feeding:");
  console.log("  Name:", zombieAfter.name);
  console.log("  Level:", zombieAfter.level.toString(), `(gained ${levelGain} levels!)`);
  console.log("  DNA:", zombieAfter.dna.toString(), "(unchanged)");

  const ownerZombies = await contract.getZombiesByOwner(signer.address);
  console.log("\nYou still own", ownerZombies.length, "zombie(s) — no child was spawned.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nError:", error.message);
    process.exit(1);
  });
