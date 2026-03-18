import { expect } from "chai";
import hre from "hardhat";
import { PlatformRegistry } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("PlatformRegistry", function () {
  let registry: PlatformRegistry;
  let admin: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let feeCollector: HardhatEthersSigner;

  const DEFAULT_FEE_BPS = 100; // 1%

  beforeEach(async function () {
    [admin, alice, bob, feeCollector] = await hre.ethers.getSigners();
    const factory = await hre.ethers.getContractFactory("PlatformRegistry");
    registry = await factory.deploy(
      admin.address,
      DEFAULT_FEE_BPS,
      feeCollector.address
    );
    await registry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("deploys successfully", async function () {
      const addr = await registry.getAddress();
      expect(addr).to.be.properAddress;
    });

    it("sets correct owner", async function () {
      expect(await registry.owner()).to.equal(admin.address);
    });

    it("sets correct feeBasisPoints", async function () {
      expect(await registry.feeBasisPoints()).to.equal(DEFAULT_FEE_BPS);
    });

    it("sets correct feeCollector", async function () {
      expect(await registry.feeCollector()).to.equal(feeCollector.address);
    });

    it("starts unpaused", async function () {
      expect(await registry.paused()).to.equal(false);
    });

    it("starts with zero userCount", async function () {
      expect(await registry.userCount()).to.equal(0n);
    });

    it("reverts if fee exceeds 1000 (10%)", async function () {
      const factory = await hre.ethers.getContractFactory("PlatformRegistry");
      await expect(
        factory.deploy(admin.address, 1001, feeCollector.address)
      ).to.be.revertedWithCustomError(registry, "InvalidInput");
    });

    it("reverts if feeCollector is zero address", async function () {
      const factory = await hre.ethers.getContractFactory("PlatformRegistry");
      await expect(
        factory.deploy(admin.address, DEFAULT_FEE_BPS, hre.ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(registry, "InvalidInput");
    });
  });

  describe("User Registration", function () {
    it("register() creates user profile", async function () {
      await registry.connect(alice).register();
      const profile = await registry.users(alice.address);
      expect(profile.registered).to.equal(true);
      expect(profile.suspended).to.equal(false);
      expect(profile.registeredAt).to.be.gt(0n);
    });

    it("register() increments userCount", async function () {
      expect(await registry.userCount()).to.equal(0n);
      await registry.connect(alice).register();
      expect(await registry.userCount()).to.equal(1n);
      await registry.connect(bob).register();
      expect(await registry.userCount()).to.equal(2n);
    });

    it("register() emits UserRegistered event", async function () {
      await expect(registry.connect(alice).register())
        .to.emit(registry, "UserRegistered")
        .withArgs(alice.address);
    });

    it("isRegistered() returns true after registration", async function () {
      await registry.connect(alice).register();
      expect(await registry.isRegistered(alice.address)).to.equal(true);
    });

    it("isRegistered() returns false for unregistered user", async function () {
      expect(await registry.isRegistered(alice.address)).to.equal(false);
    });

    it("register() reverts on double registration", async function () {
      await registry.connect(alice).register();
      await expect(
        registry.connect(alice).register()
      ).to.be.revertedWithCustomError(registry, "InvalidState");
    });

    it("register() reverts when paused", async function () {
      await registry.connect(admin).pause();
      await expect(
        registry.connect(alice).register()
      ).to.be.revertedWithCustomError(registry, "EnforcedPause");
    });
  });

  describe("User Suspension", function () {
    beforeEach(async function () {
      await registry.connect(alice).register();
    });

    it("suspendUser() suspends a registered user", async function () {
      await registry.connect(admin).suspendUser(alice.address);
      const profile = await registry.users(alice.address);
      expect(profile.suspended).to.equal(true);
    });

    it("suspendUser() emits UserSuspended event", async function () {
      await expect(registry.connect(admin).suspendUser(alice.address))
        .to.emit(registry, "UserSuspended")
        .withArgs(alice.address);
    });

    it("isSuspended() returns true after suspension", async function () {
      await registry.connect(admin).suspendUser(alice.address);
      expect(await registry.isSuspended(alice.address)).to.equal(true);
    });

    it("suspendUser() reverts for unregistered user", async function () {
      await expect(
        registry.connect(admin).suspendUser(bob.address)
      ).to.be.revertedWithCustomError(registry, "InvalidState");
    });

    it("suspendUser() reverts if already suspended", async function () {
      await registry.connect(admin).suspendUser(alice.address);
      await expect(
        registry.connect(admin).suspendUser(alice.address)
      ).to.be.revertedWithCustomError(registry, "InvalidState");
    });

    it("suspendUser() reverts when called by non-owner", async function () {
      await expect(
        registry.connect(alice).suspendUser(alice.address)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("reinstateUser() reinstates a suspended user", async function () {
      await registry.connect(admin).suspendUser(alice.address);
      await registry.connect(admin).reinstateUser(alice.address);
      const profile = await registry.users(alice.address);
      expect(profile.suspended).to.equal(false);
    });

    it("reinstateUser() emits UserReinstated event", async function () {
      await registry.connect(admin).suspendUser(alice.address);
      await expect(registry.connect(admin).reinstateUser(alice.address))
        .to.emit(registry, "UserReinstated")
        .withArgs(alice.address);
    });

    it("reinstateUser() reverts if not suspended", async function () {
      await expect(
        registry.connect(admin).reinstateUser(alice.address)
      ).to.be.revertedWithCustomError(registry, "InvalidState");
    });

    it("reinstateUser() reverts when called by non-owner", async function () {
      await registry.connect(admin).suspendUser(alice.address);
      await expect(
        registry.connect(alice).reinstateUser(alice.address)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  describe("Contract Management", function () {
    it("registerContract() registers a contract address", async function () {
      await registry.connect(admin).registerContract(alice.address);
      expect(await registry.registeredContracts(alice.address)).to.equal(true);
      expect(await registry.isRegisteredContract(alice.address)).to.equal(true);
    });

    it("registerContract() emits ContractRegistered event", async function () {
      await expect(registry.connect(admin).registerContract(alice.address))
        .to.emit(registry, "ContractRegistered")
        .withArgs(alice.address);
    });

    it("registerContract() reverts for zero address", async function () {
      await expect(
        registry.connect(admin).registerContract(hre.ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(registry, "InvalidInput");
    });

    it("registerContract() reverts if already registered", async function () {
      await registry.connect(admin).registerContract(alice.address);
      await expect(
        registry.connect(admin).registerContract(alice.address)
      ).to.be.revertedWithCustomError(registry, "InvalidState");
    });

    it("registerContract() reverts when called by non-owner", async function () {
      await expect(
        registry.connect(alice).registerContract(bob.address)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("deregisterContract() removes a registered contract", async function () {
      await registry.connect(admin).registerContract(alice.address);
      await registry.connect(admin).deregisterContract(alice.address);
      expect(await registry.registeredContracts(alice.address)).to.equal(false);
      expect(await registry.isRegisteredContract(alice.address)).to.equal(false);
    });

    it("deregisterContract() emits ContractDeregistered event", async function () {
      await registry.connect(admin).registerContract(alice.address);
      await expect(registry.connect(admin).deregisterContract(alice.address))
        .to.emit(registry, "ContractDeregistered")
        .withArgs(alice.address);
    });

    it("deregisterContract() reverts if not registered", async function () {
      await expect(
        registry.connect(admin).deregisterContract(alice.address)
      ).to.be.revertedWithCustomError(registry, "InvalidState");
    });

    it("deregisterContract() reverts when called by non-owner", async function () {
      await registry.connect(admin).registerContract(alice.address);
      await expect(
        registry.connect(alice).deregisterContract(alice.address)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  describe("Fee Configuration", function () {
    it("setFeeBasisPoints() updates fee", async function () {
      await registry.connect(admin).setFeeBasisPoints(500);
      expect(await registry.feeBasisPoints()).to.equal(500n);
    });

    it("setFeeBasisPoints() emits FeeUpdated event", async function () {
      await expect(registry.connect(admin).setFeeBasisPoints(500))
        .to.emit(registry, "FeeUpdated")
        .withArgs(500);
    });

    it("setFeeBasisPoints() allows 0 fee", async function () {
      await registry.connect(admin).setFeeBasisPoints(0);
      expect(await registry.feeBasisPoints()).to.equal(0n);
    });

    it("setFeeBasisPoints() allows max 1000 (10%)", async function () {
      await registry.connect(admin).setFeeBasisPoints(1000);
      expect(await registry.feeBasisPoints()).to.equal(1000n);
    });

    it("setFeeBasisPoints() reverts above 1000", async function () {
      await expect(
        registry.connect(admin).setFeeBasisPoints(1001)
      ).to.be.revertedWithCustomError(registry, "InvalidInput");
    });

    it("setFeeBasisPoints() reverts when called by non-owner", async function () {
      await expect(
        registry.connect(alice).setFeeBasisPoints(200)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("setFeeCollector() updates collector address", async function () {
      await registry.connect(admin).setFeeCollector(bob.address);
      expect(await registry.feeCollector()).to.equal(bob.address);
    });

    it("setFeeCollector() emits FeeCollectorUpdated event", async function () {
      await expect(registry.connect(admin).setFeeCollector(bob.address))
        .to.emit(registry, "FeeCollectorUpdated")
        .withArgs(bob.address);
    });

    it("setFeeCollector() reverts for zero address", async function () {
      await expect(
        registry.connect(admin).setFeeCollector(hre.ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(registry, "InvalidInput");
    });

    it("setFeeCollector() reverts when called by non-owner", async function () {
      await expect(
        registry.connect(alice).setFeeCollector(bob.address)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  describe("Pause / Unpause", function () {
    it("pause() sets paused to true", async function () {
      await registry.connect(admin).pause();
      expect(await registry.paused()).to.equal(true);
    });

    it("pause() emits Paused event", async function () {
      await expect(registry.connect(admin).pause())
        .to.emit(registry, "Paused")
        .withArgs(admin.address);
    });

    it("unpause() sets paused to false", async function () {
      await registry.connect(admin).pause();
      await registry.connect(admin).unpause();
      expect(await registry.paused()).to.equal(false);
    });

    it("unpause() emits Unpaused event", async function () {
      await registry.connect(admin).pause();
      await expect(registry.connect(admin).unpause())
        .to.emit(registry, "Unpaused")
        .withArgs(admin.address);
    });

    it("pause() reverts when called by non-owner", async function () {
      await expect(
        registry.connect(alice).pause()
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("unpause() reverts when called by non-owner", async function () {
      await registry.connect(admin).pause();
      await expect(
        registry.connect(alice).unpause()
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });
});
