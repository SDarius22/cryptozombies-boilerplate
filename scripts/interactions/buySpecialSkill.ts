import { ethers } from "hardhat";
import { ZombieOwnership } from "../../typechain-types";

/**
 * Feature 2: Buy a special skill for your zombie.
 *
 * Skill IDs (each skill has its own fee, configurable by the contract owner):
 *   1 = Fireball   (+10% attack victory probability)            — 0.01 ETH
 *   2 = IceShield  (-10% enemy attack probability when defending) — 1   ETH  ← expensive!
 *   3 = PoisonClaw (enemy loses a level on defeat)              — 0.05 ETH
 *
 * The actual fee is always read from the contract via getSkillFee(skillId).
 *
 * Usage:
 *   ZOMBIE_ID=0 SKILL_ID=1 npm run interact:buyskill
 *
 * Demo the "insufficient payment" revert (Contract-level):
 *   ZOMBIE_ID=0 SKILL_ID=2 PAY_OVERRIDE=0.01 npm run interact:buyskill
 *   (pays 0.01 ETH for IceShield which costs 1 ETH → "Incorrect ETH amount")
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
  const payOverrideStr = process.env.PAY_OVERRIDE;

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

  console.log("Buy Special Skill (Feature 2)\n");
  console.log("Contract address:", contractAddress);
  console.log("Zombie ID:", zombieId);
  console.log("Skill:", skillId, "-", SKILL_DESCRIPTIONS[skillId]);

  const [signer] = await ethers.getSigners();
  console.log("Using account:", signer.address);

  const contract = (await ethers.getContractAt(
    "ZombieOwnership",
    contractAddress
  )) as unknown as ZombieOwnership;

  const requiredFee = await contract.getSkillFee(skillId);
  console.log("Required fee:", ethers.formatEther(requiredFee), "ETH");

  const valueToSend = payOverrideStr
    ? ethers.parseEther(payOverrideStr)
    : requiredFee;

  if (payOverrideStr) {
    console.log(
      "PAY_OVERRIDE active: sending",
      ethers.formatEther(valueToSend),
      "ETH instead of the required",
      ethers.formatEther(requiredFee),
      "ETH"
    );
  }

  const balance = await ethers.provider.getBalance(signer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Pre-flight: classify what kind of failure (if any) to expect.
  if (valueToSend > balance) {
    console.warn(
      `Pre-flight: send amount (${ethers.formatEther(valueToSend)} ETH) exceeds account balance ` +
        `(${ethers.formatEther(balance)} ETH). Expecting an EVM-level 'insufficient funds' rejection — ` +
        `the contract will not even execute.`
    );
  } else if (valueToSend > requiredFee) {
    console.warn(
      `Pre-flight: send amount (${ethers.formatEther(valueToSend)} ETH) is GREATER than the required fee ` +
        `(${ethers.formatEther(requiredFee)} ETH). The contract enforces exact match, so this will revert ` +
        `with "Incorrect ETH amount" (overpayment). To trigger an EVM-level 'insufficient funds' instead, ` +
        `set PAY_OVERRIDE to a value above your balance (> ${ethers.formatEther(balance)} ETH).`
    );
  } else if (valueToSend < requiredFee) {
    console.warn(
      `Pre-flight: send amount (${ethers.formatEther(valueToSend)} ETH) is LESS than the required fee ` +
        `(${ethers.formatEther(requiredFee)} ETH). Contract will revert with "Incorrect ETH amount" (underpayment).`
    );
  }

  const zombieBefore = await contract.zombies(zombieId);
  const currentSkillName = await contract.getSpecialSkillName(
    zombieBefore.specialSkill
  );
  console.log("\nZombie current skill:", currentSkillName);

  console.log("\nBuying special skill...");
  try {
    const tx = await contract.buySpecialSkill(zombieId, skillId, {
      value: valueToSend,
    });
    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("Transaction confirmed!");

    const zombieAfter = await contract.zombies(zombieId);
    const newSkillName = await contract.getSpecialSkillName(
      zombieAfter.specialSkill
    );
    console.log("\nSkill purchased successfully!");
    console.log("Zombie Details:");
    console.log("  Name:", zombieAfter.name);
    console.log("  Level:", zombieAfter.level.toString());
    console.log("  Special Skill:", newSkillName, "(ID:", zombieAfter.specialSkill, ")");
  } catch (error: any) {
    console.log("\nPurchase failed.");
    const reason: string =
      error?.reason ||
      error?.shortMessage ||
      error?.info?.error?.message ||
      error?.message ||
      "unknown";
    console.log("Reason:", reason);
    if (reason.toLowerCase().includes("insufficient funds")) {
      console.log(
        `→ EVM-level revert: account holds ${ethers.formatEther(balance)} ETH but tried to send ${ethers.formatEther(valueToSend)} ETH (plus gas).`
      );
    } else if (reason.includes("Incorrect ETH amount")) {
      if (valueToSend > requiredFee) {
        const diff = valueToSend - requiredFee;
        console.log(
          `→ Contract-level revert: OVERPAYMENT — sent ${ethers.formatEther(valueToSend)} ETH, ` +
            `only ${ethers.formatEther(requiredFee)} ETH required (${ethers.formatEther(diff)} ETH too much). ` +
            `The contract enforces exact match.`
        );
      } else if (valueToSend < requiredFee) {
        const diff = requiredFee - valueToSend;
        console.log(
          `→ Contract-level revert: UNDERPAYMENT — sent ${ethers.formatEther(valueToSend)} ETH, ` +
            `needs ${ethers.formatEther(requiredFee)} ETH (${ethers.formatEther(diff)} ETH short).`
        );
      } else {
        console.log("→ Contract-level revert: msg.value did not match getSkillFee(skillId).");
      }
    }
    process.exitCode = 1;
  }
}

main().then(() => process.exit(process.exitCode ?? 0));
