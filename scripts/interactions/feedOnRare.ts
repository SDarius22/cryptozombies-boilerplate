import { ethers } from "hardhat";
import { ZombieOwnership } from "../../typechain-types";

/**
 * Feature 1: Feed your zombie on a rare creature to gain 2 extra levels.
 *
 * Usage:
 *   ZOMBIE_ID=0 RARE_DNA=1234567890123456 npm run interact:feedrare
 *
 * Or with a custom contract address:
 *   CONTRACT_ADDRESS=0x... ZOMBIE_ID=0 RARE_DNA=9999999999999999 npm run interact:feedrare
 */

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const zombieIdStr = process.env.ZOMBIE_ID;
  const rareDnaStr = process.env.RARE_DNA;

  if (!zombieIdStr) {
    console.error("Error: ZOMBIE_ID environment variable not set");
    console.log("\nUsage: ZOMBIE_ID=0 RARE_DNA=1234567890123456 npm run interact:feedrare");
    process.exit(1);
  }

  if (!rareDnaStr) {
    console.error("Error: RARE_DNA environment variable not set");
    console.log("\nUsage: ZOMBIE_ID=0 RARE_DNA=1234567890123456 npm run interact:feedrare");
    process.exit(1);
  }

  const zombieId = parseInt(zombieIdStr);
  const rareDna = BigInt(rareDnaStr);

  console.log("🐉 Rare Feeding (Feature 1)\n");
  console.log("Contract address:", contractAddress);
  console.log("Zombie ID:", zombieId);
  console.log("Rare creature DNA:", rareDna.toString());

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

  console.log("\n⏳ Feeding on rare creature...");
  const tx = await contract.feedOnRare(zombieId, rareDna);
  console.log("Transaction hash:", tx.hash);
  await tx.wait();
  console.log("✅ Transaction confirmed!");

  const zombieAfter = await contract.zombies(zombieId);
  console.log("\n🎉 Rare feeding successful!");
  console.log("Zombie after feeding:");
  console.log("  Name:", zombieAfter.name);
  console.log("  Level:", zombieAfter.level.toString(), "(gained", (Number(zombieAfter.level) - Number(zombieBefore.level)).toString(), "levels!)");
  console.log("  DNA:", zombieAfter.dna.toString());

  const ownerZombies = await contract.getZombiesByOwner(signer.address);
  console.log("\n🧟 You now own", ownerZombies.length, "zombie(s).");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nError:", error.message);
    process.exit(1);
  });
