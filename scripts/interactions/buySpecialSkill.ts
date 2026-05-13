import { ethers } from "hardhat";
import { ZombieOwnership } from "../../typechain-types";

/**
 * Feature 2: Buy a special skill for your zombie.
 *
 * Skill IDs:
 *   1 = Fireball   (+10% attack victory probability)
 *   2 = IceShield  (reduces attacker win probability by 10% when defending)
 *   3 = PoisonClaw (enemy loses a level on defeat)
 *
 * Cost: 0.01 ETH per skill (configurable by contract owner)
 *
 * Usage:
 *   ZOMBIE_ID=0 SKILL_ID=1 npm run interact:buyskill
 */

const SKILL_DESCRIPTIONS: Record<number, string> = {
  1: "Fireball   (+10% attack probability)",
  2: "IceShield  (-10% enemy attack probability when defending)",
  3: "PoisonClaw (enemy loses a level on defeat)",
};

async function main() {
  const contractAddress =
    process.env.CONTRACT_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const zombieIdStr = process.env.ZOMBIE_ID;
  const skillIdStr = process.env.SKILL_ID;

  if (!zombieIdStr) {
    console.error("Error: ZOMBIE_ID environment variable not set");
    console.log("\nUsage: ZOMBIE_ID=0 SKILL_ID=1 npm run interact:buyskill");
    process.exit(1);
  }

  if (!skillIdStr) {
    console.error(
      "Error: SKILL_ID not set (1=Fireball, 2=IceShield, 3=PoisonClaw)"
    );
    console.log("\nUsage: ZOMBIE_ID=0 SKILL_ID=1 npm run interact:buyskill");
    process.exit(1);
  }

  const zombieId = parseInt(zombieIdStr);
  const skillId = parseInt(skillIdStr);

  if (skillId < 1 || skillId > 3) {
    console.error("Error: SKILL_ID must be 1, 2, or 3");
    process.exit(1);
  }

  const skillFee = ethers.parseEther("0.01");

  console.log("\u2694\ufe0f  Buy Special Skill (Feature 2)\n");
  console.log("Contract address:", contractAddress);
  console.log("Zombie ID:", zombieId);
  console.log("Skill:", skillId, "-", SKILL_DESCRIPTIONS[skillId]);
  console.log("Cost: 0.01 ETH");

  const [signer] = await ethers.getSigners();
  console.log("Using account:", signer.address);

  const contract = (await ethers.getContractAt(
    "ZombieOwnership",
    contractAddress
  )) as unknown as ZombieOwnership;

  const zombieBefore = await contract.zombies(zombieId);
  const currentSkillName = await contract.getSpecialSkillName(
    zombieBefore.specialSkill
  );
  console.log("\nZombie current skill:", currentSkillName);

  console.log("\n\u23f3 Buying special skill...");
  const tx = await contract.buySpecialSkill(zombieId, skillId, {
    value: skillFee,
  });
  console.log("Transaction hash:", tx.hash);
  await tx.wait();
  console.log("\u2705 Transaction confirmed!");

  const zombieAfter = await contract.zombies(zombieId);
  const newSkillName = await contract.getSpecialSkillName(
    zombieAfter.specialSkill
  );
  console.log("\n\ud83c\udf89 Skill purchased successfully!");
  console.log("Zombie Details:");
  console.log("  Name:", zombieAfter.name);
  console.log("  Level:", zombieAfter.level.toString());
  console.log("  Special Skill:", newSkillName, "(ID:", zombieAfter.specialSkill, ")");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nError:", error.message);
    process.exit(1);
  });

