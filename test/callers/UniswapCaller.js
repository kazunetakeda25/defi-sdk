import buyTokenOnUniswap from '../helpers/buyTokenOnUniswap';
import { wethAddress, ethAddress, daiAddress } from '../helpers/tokens';

const { expect } = require('chai');

const { ethers } = require('hardhat');

const AMOUNT_ABSOLUTE = 2;
const SWAP_FIXED_INPUTS = 1;
const SWAP_FIXED_OUTPUTS = 2;
const EMPTY_BYTES = '0x';

const uniDaiWethAddress = '0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11';

const zeroPermit = ['0', EMPTY_BYTES];
const zeroSignature = ['0', EMPTY_BYTES];

describe('UniswapCaller', () => {
  let owner;
  let notOwner;
  let caller;
  let Router;
  let Caller;
  let router;
  let weth;
  let dai;
  let protocolFeeDefault;
  const logger = new ethers.utils.Logger('1');
  const abiCoder = new ethers.utils.AbiCoder();

  before(async () => {
    Caller = await ethers.getContractFactory('UniswapCaller');
    Router = await ethers.getContractFactory('Router');

    [owner, notOwner] = await ethers.getSigners();

    const weth9 = await ethers.getContractAt('IWETH9', wethAddress);

    await weth9.deposit({
      value: ethers.utils.parseEther('2'),
      gasLimit: 1000000,
    });

    caller = await Caller.deploy();

    weth = await ethers.getContractAt('IERC20', wethAddress, owner);
    dai = await ethers.getContractAt('IERC20', daiAddress, owner);

    await buyTokenOnUniswap(owner, daiAddress);
    protocolFeeDefault = [ethers.utils.parseUnits('0.01', 18), notOwner.address];
  });

  beforeEach(async () => {
    router = await Router.deploy();
  });

  it('should not do weth -> dai trade with high slippage', async () => {
    await weth.approve(router.address, ethers.utils.parseUnits('1', 18));
    await router.setProtocolFeeDefault(protocolFeeDefault);

    await expect(
      router.functions.execute(
        // input
        [[weth.address, ethers.utils.parseUnits('1', 18), AMOUNT_ABSOLUTE], zeroPermit],
        // output
        [daiAddress, ethers.utils.parseUnits('5000', 18)],
        // swap description
        [
          SWAP_FIXED_INPUTS,
          protocolFeeDefault,
          protocolFeeDefault,
          owner.address,
          caller.address,
          abiCoder.encode(
            ['address[]', 'bool[]', 'uint8', 'uint256', 'bool'],
            [
              [uniDaiWethAddress],
              [false],
              SWAP_FIXED_INPUTS,
              ethers.utils.parseUnits('1', 18),
              false,
            ],
          ),
        ],
        // account signature
        zeroSignature,
        // fee signature
        zeroSignature,
      ),
    ).to.be.reverted;
  });

  it('should do weth -> dai trade', async () => {
    await weth.approve(router.address, ethers.utils.parseUnits('1', 18));
    await router.setProtocolFeeDefault(protocolFeeDefault);

    logger.info(
      `dai balance is ${ethers.utils.formatUnits(await dai.balanceOf(owner.address), 18)}`,
    );
    logger.info(
      `weth balance is ${ethers.utils.formatUnits(await weth.balanceOf(owner.address), 18)}`,
    );
    const tx = await router.functions.execute(
      // input
      [[weth.address, ethers.utils.parseUnits('1', 18), AMOUNT_ABSOLUTE], zeroPermit],
      // output
      [daiAddress, ethers.utils.parseUnits('1000', 18)],
      // swap description
      [
        SWAP_FIXED_INPUTS,
        protocolFeeDefault,
        protocolFeeDefault,
        owner.address,
        caller.address,
        abiCoder.encode(
          ['address[]', 'bool[]', 'uint8', 'uint256', 'bool'],
          [
            [uniDaiWethAddress],
            [false],
            SWAP_FIXED_INPUTS,
            ethers.utils.parseUnits('1', 18),
            false,
          ],
        ),
      ],
      // account signature
      zeroSignature,
      // fee signature
      zeroSignature,
    );
    logger.info(`Called router for ${(await tx.wait()).gasUsed} gas`);
    logger.info(
      `dai balance is ${ethers.utils.formatUnits(await dai.balanceOf(owner.address), 18)}`,
    );
    logger.info(
      `weth balance is ${ethers.utils.formatUnits(await weth.balanceOf(owner.address), 18)}`,
    );
  });

  it('should do eth -> dai trade', async () => {
    await router.setProtocolFeeDefault(protocolFeeDefault);

    logger.info(
      `dai balance is ${ethers.utils.formatUnits(await dai.balanceOf(owner.address), 18)}`,
    );
    const tx = await router.functions.execute(
      // input
      [[ethAddress, ethers.utils.parseUnits('1', 18), AMOUNT_ABSOLUTE], zeroPermit],
      // output
      [daiAddress, ethers.utils.parseUnits('1000', 18)],
      // swap description
      [
        SWAP_FIXED_INPUTS,
        protocolFeeDefault,
        protocolFeeDefault,
        owner.address,
        caller.address,
        abiCoder.encode(
          ['address[]', 'bool[]', 'uint8', 'uint256', 'bool'],
          [
            [uniDaiWethAddress],
            [false],
            SWAP_FIXED_INPUTS,
            ethers.utils.parseUnits('1', 18),
            false,
          ],
        ),
      ],
      // account signature
      zeroSignature,
      // fee signature
      zeroSignature,
      {
        value: ethers.utils.parseEther('1'),
      },
    );
    logger.info(`Called router for ${(await tx.wait()).gasUsed} gas`);
    logger.info(
      `dai balance is ${ethers.utils.formatUnits(await dai.balanceOf(owner.address), 18)}`,
    );
  });

  it('should not do eth -> dai trade with high slippage', async () => {
    await router.setProtocolFeeDefault(protocolFeeDefault);

    await expect(
      router.functions.execute(
        // input
        [[ethAddress, ethers.utils.parseUnits('1', 18), AMOUNT_ABSOLUTE], zeroPermit],
        // output
        [daiAddress, ethers.utils.parseUnits('5000', 18)],
        // swap description
        [
          SWAP_FIXED_OUTPUTS,
          protocolFeeDefault,
          protocolFeeDefault,
          owner.address,
          caller.address,
          abiCoder.encode(
            ['address[]', 'bool[]', 'uint8', 'uint256', 'bool'],
            [
              [uniDaiWethAddress],
              [false],
              SWAP_FIXED_OUTPUTS,
              ethers.utils.parseUnits('5000', 18),
              false,
            ],
          ),
        ],
        // account signature
        zeroSignature,
        // fee signature
        zeroSignature,
        {
          value: ethers.utils.parseEther('1'),
        },
      ),
    ).to.be.reverted;
  });

  it('should do dai -> eth trade with 0 input', async () => {
    await dai.approve(router.address, ethers.utils.parseUnits('4000', 18));
    await router.setProtocolFeeDefault(protocolFeeDefault);

    await expect(
      router.functions.execute(
        // input
        [[daiAddress, ethers.utils.parseUnits('0', 18), AMOUNT_ABSOLUTE], zeroPermit],
        // output
        [ethAddress, ethers.utils.parseUnits('0', 18)],
        // swap description
        [
          SWAP_FIXED_INPUTS,
          protocolFeeDefault,
          protocolFeeDefault,
          owner.address,
          caller.address,
          abiCoder.encode(
            ['address[]', 'bool[]', 'uint8', 'uint256', 'bool'],
            [
              [uniDaiWethAddress],
              [true],
              SWAP_FIXED_INPUTS,
              ethers.utils.parseUnits('0', 18),
              true,
            ],
          ),
        ],
        // account signature
        zeroSignature,
        // fee signature
        zeroSignature,
      ),
    ).to.be.reverted;
  });

  it('should do dai -> eth trade', async () => {
    await dai.approve(router.address, ethers.utils.parseUnits('4000', 18));
    await router.setProtocolFeeDefault(protocolFeeDefault);

    logger.info(
      `dai balance is ${ethers.utils.formatUnits(await dai.balanceOf(owner.address), 18)}`,
    );
    const tx = await router.functions.execute(
      // input
      [[daiAddress, ethers.utils.parseUnits('4000', 18), AMOUNT_ABSOLUTE], zeroPermit],
      // output
      [ethAddress, ethers.utils.parseUnits('0.1', 18)],
      // swap description
      [
        SWAP_FIXED_INPUTS,
        protocolFeeDefault,
        protocolFeeDefault,
        owner.address,
        caller.address,
        abiCoder.encode(
          ['address[]', 'bool[]', 'uint8', 'uint256', 'bool'],
          [
            [uniDaiWethAddress],
            [true],
            SWAP_FIXED_INPUTS,
            ethers.utils.parseUnits('4000', 18),
            true,
          ],
        ),
      ],
      // account signature
      zeroSignature,
      // fee signature
      zeroSignature,
    );
    logger.info(`Called router for ${(await tx.wait()).gasUsed} gas`);
    logger.info(
      `dai balance is ${ethers.utils.formatUnits(await dai.balanceOf(owner.address), 18)}`,
    );
  });

  it('should do dai -> weth trade with 0 output', async () => {
    await dai.approve(router.address, ethers.utils.parseUnits('5000', 18));
    await router.setProtocolFeeDefault(protocolFeeDefault);

    await expect(
      router.functions.execute(
        // input
        [[daiAddress, ethers.utils.parseUnits('0', 18), AMOUNT_ABSOLUTE], zeroPermit],
        // output
        [wethAddress, ethers.utils.parseUnits('0', 18)],
        // swap description
        [
          SWAP_FIXED_OUTPUTS,
          protocolFeeDefault,
          protocolFeeDefault,
          owner.address,
          caller.address,
          abiCoder.encode(
            ['address[]', 'bool[]', 'uint8', 'uint256', 'bool'],
            [
              [uniDaiWethAddress],
              [true],
              SWAP_FIXED_OUTPUTS,
              ethers.utils.parseUnits('0', 18),
              false,
            ],
          ),
        ],
        // account signature
        zeroSignature,
        // fee signature
        zeroSignature,
      ),
    ).to.be.reverted;
  });

  it('should not do dai -> weth trade with empty path', async () => {
    await dai.approve(router.address, ethers.utils.parseUnits('1', 18));
    await router.setProtocolFeeDefault(protocolFeeDefault);

    await expect(
      router.functions.execute(
        // input
        [[daiAddress, ethers.utils.parseUnits('1', 18), AMOUNT_ABSOLUTE], zeroPermit],
        // output
        [wethAddress, ethers.utils.parseUnits('1', 18)],
        // swap description
        [
          SWAP_FIXED_OUTPUTS,
          protocolFeeDefault,
          protocolFeeDefault,
          owner.address,
          caller.address,
          abiCoder.encode(
            ['address[]', 'bool[]', 'uint8', 'uint256', 'bool'],
            [
              [],
              [],
              SWAP_FIXED_OUTPUTS,
              ethers.utils.parseUnits((1 / 0.98).toString(), 18),
              false,
            ],
          ),
        ],
        // account signature
        zeroSignature,
        // fee signature
        zeroSignature,
      ),
    ).to.be.reverted;
  });

  it('should not do dai -> weth trade with bad directions length', async () => {
    await dai.approve(router.address, ethers.utils.parseUnits('5000', 18));
    await router.setProtocolFeeDefault(protocolFeeDefault);

    await expect(
      router.functions.execute(
        // input
        [[daiAddress, ethers.utils.parseUnits('5000', 18), AMOUNT_ABSOLUTE], zeroPermit],
        // output
        [wethAddress, ethers.utils.parseUnits('1', 18)],
        // swap description
        [
          SWAP_FIXED_OUTPUTS,
          protocolFeeDefault,
          protocolFeeDefault,
          owner.address,
          caller.address,
          abiCoder.encode(
            ['address[]', 'bool[]', 'uint8', 'uint256', 'bool'],
            [
              [uniDaiWethAddress],
              [true, false],
              SWAP_FIXED_OUTPUTS,
              ethers.utils.parseUnits((1 / 0.98).toString(), 18),
              false,
            ],
          ),
        ],
        // account signature
        zeroSignature,
        // fee signature
        zeroSignature,
      ),
    ).to.be.reverted;
  });

  it('should do dai -> weth trade', async () => {
    await dai.approve(router.address, ethers.utils.parseUnits('5000', 18));
    await router.setProtocolFeeDefault(protocolFeeDefault);

    logger.info(
      `dai balance is ${ethers.utils.formatUnits(await dai.balanceOf(owner.address), 18)}`,
    );
    logger.info(
      `weth balance is ${ethers.utils.formatUnits(await weth.balanceOf(owner.address), 18)}`,
    );
    const tx = await router.functions.execute(
      // input
      [[daiAddress, ethers.utils.parseUnits('5000', 18), AMOUNT_ABSOLUTE], zeroPermit],
      // output
      [wethAddress, ethers.utils.parseUnits('1', 18)],
      // swap description
      [
        SWAP_FIXED_OUTPUTS,
        protocolFeeDefault,
        protocolFeeDefault,
        owner.address,
        caller.address,
        abiCoder.encode(
          ['address[]', 'bool[]', 'uint8', 'uint256', 'bool'],
          [
            [uniDaiWethAddress],
            [true],
            SWAP_FIXED_OUTPUTS,
            ethers.utils.parseUnits((1 / 0.98).toString(), 18),
            false,
          ],
        ),
      ],
      // account signature
      zeroSignature,
      // fee signature
      zeroSignature,
    );
    logger.info(`Called router for ${(await tx.wait()).gasUsed} gas`);
    logger.info(
      `dai balance is ${ethers.utils.formatUnits(await dai.balanceOf(owner.address), 18)}`,
    );
    logger.info(
      `weth balance is ${ethers.utils.formatUnits(await weth.balanceOf(owner.address), 18)}`,
    );
  });

  it('should not do dai -> weth trade with high token slippage', async () => {
    await dai.approve(router.address, ethers.utils.parseUnits('3000', 18));
    await router.setProtocolFeeDefault(protocolFeeDefault);

    await expect(
      router.functions.execute(
        // input
        [[daiAddress, ethers.utils.parseUnits('3000', 18), AMOUNT_ABSOLUTE], zeroPermit],
        // output
        [wethAddress, ethers.utils.parseUnits('1', 18)],
        // swap description
        [
          SWAP_FIXED_OUTPUTS,
          protocolFeeDefault,
          protocolFeeDefault,
          owner.address,
          caller.address,
          abiCoder.encode(
            ['address[]', 'bool[]', 'uint8', 'uint256', 'bool'],
            [
              [uniDaiWethAddress],
              [true],
              SWAP_FIXED_OUTPUTS,
              ethers.utils.parseUnits('1', 18),
              false,
            ],
          ),
        ],
        // account signature
        zeroSignature,
        // fee signature
        zeroSignature,
      ),
    ).to.be.reverted;
  });

  it('should not do dai -> weth trade with not enough liquidity', async () => {
    await dai.approve(router.address, ethers.utils.parseUnits('5000', 18));
    await router.setProtocolFeeDefault(protocolFeeDefault);

    await expect(
      router.functions.execute(
        // input
        [[daiAddress, ethers.utils.parseUnits('1', 18), AMOUNT_ABSOLUTE], zeroPermit],
        // output
        [wethAddress, ethers.utils.parseUnits('1', 18)],
        // swap description
        [
          SWAP_FIXED_OUTPUTS,
          protocolFeeDefault,
          protocolFeeDefault,
          owner.address,
          caller.address,
          abiCoder.encode(
            ['address[]', 'bool[]', 'uint8', 'uint256', 'bool'],
            [
              [uniDaiWethAddress],
              [true],
              SWAP_FIXED_OUTPUTS,
              ethers.utils.parseUnits('20000', 18),
              false,
            ],
          ),
        ],
        // account signature
        zeroSignature,
        // fee signature
        zeroSignature,
      ),
    ).to.be.reverted;
  });
});
