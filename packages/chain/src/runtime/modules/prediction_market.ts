import { TokenId, UInt64 } from "@proto-kit/library";
import { runtimeModule, state, runtimeMethod, RuntimeModule } from "@proto-kit/module";
import { State, StateMap, assert } from "@proto-kit/protocol";
import { PublicKey, Bool, Struct, CircuitString, Provable } from "o1js";
import { inject } from "tsyringe";
import { Balances } from "./balances";

export class Bets extends Struct({
  betId: UInt64,
  yesBetAmount: UInt64,
  noBetAmount: UInt64,
  isOver: Bool,
  result: Bool,
  startingTimestamp: UInt64,
  endingTimestamp: UInt64,
  minimumStakeAmount: UInt64,
  description: CircuitString
}) {}

export class StakedId extends Struct({
  betId: UInt64,
  publicKey: PublicKey
}) {}

@runtimeModule()
export class PredictionMarket extends RuntimeModule {
  @state() public stakedToYes = StateMap.from<StakedId,UInt64>(StakedId, UInt64);
  @state() public stakedToNo = StateMap.from<StakedId,UInt64>(StakedId, UInt64);
  @state() public lastBetId = State.from<UInt64>(UInt64);
  @state() public totalBets = StateMap.from(UInt64, Bets);

  constructor(@inject("Balances") private balances: Balances) {
      super();
  }

  @runtimeMethod()
  public async createBet(minimumStakeAmount: UInt64, description: CircuitString) {
    let lastBetId = (await this.lastBetId.get()).orElse(UInt64.zero);
    let startingTimestamp = UInt64.from(0);
    startingTimestamp.value = this.network.block.height.value;
    let endingTimestamp = UInt64.from(0);
    endingTimestamp.value = this.network.block.height.value.add(100);
    await this.lastBetId.set(lastBetId.add(1));
    let bet = new Bets({
      betId: lastBetId,
      yesBetAmount: UInt64.zero,
      noBetAmount: UInt64.zero,
      isOver: Bool(false),
      result: Bool(false),
      startingTimestamp: startingTimestamp,
      endingTimestamp: endingTimestamp,
      minimumStakeAmount: minimumStakeAmount,
      description: description
    });
    await this.totalBets.set(lastBetId.add(1), bet);
    return bet;
  }

  @runtimeMethod()
  public async placeBet(betId: UInt64, outcome: Bool, amount: UInt64) {
    let theBet = (await this.totalBets.get(betId)).value;
    assert(theBet.isOver.not(), "The bet is over");
    assert(amount.greaterThan(theBet.minimumStakeAmount), "Amount is lower than minimum stake amount");
    
    let stakedIds = new StakedId({ betId: betId, publicKey: this.transaction.sender.value });

    
    theBet.yesBetAmount = Provable.if<UInt64>(outcome, UInt64, theBet.yesBetAmount.add(amount), theBet.yesBetAmount);
    const stakedToYes = (await this.stakedToYes.get(stakedIds)).orElse(UInt64.zero);
    let stakedToYesNew = Provable.if<UInt64>(outcome,UInt64,stakedToYes.add(amount),stakedToYes);
    await this.stakedToYes.set(stakedIds, stakedToYesNew);

    theBet.noBetAmount = Provable.if<UInt64>(outcome, UInt64, theBet.noBetAmount.add(amount), theBet.noBetAmount);
    const stakedToNo = (await this.stakedToNo.get(stakedIds)).orElse(UInt64.zero);
    let stakedToNoNew = Provable.if<UInt64>(outcome,UInt64,stakedToNo.add(amount),stakedToNo);
    await this.stakedToNo.set(stakedIds, stakedToNoNew);



    // if (outcome.toBoolean()) {
    //   theBet.yesBetAmount = theBet.yesBetAmount.add(amount);
    //   let stakedIds = new StakedId({ betId: betId, publicKey: this.transaction.sender.value });
    //   let stakedToYes = (await this.stakedToYes.get(stakedIds)).orElse(UInt64.zero);
    //   await this.stakedToYes.set(stakedIds, stakedToYes.add(amount));
    // } else {
    //   theBet.noBetAmount = theBet.noBetAmount.add(amount);
    //   let stakedIds = new StakedId({ betId: betId, publicKey: this.transaction.sender.value });
    //   let stakedToNo = (await this.stakedToNo.get(stakedIds)).orElse(UInt64.zero);
    //   await this.stakedToNo.set(stakedIds, stakedToNo.add(amount));
    // }

    await this.totalBets.set(betId, theBet);
  }

  @runtimeMethod()
  public async closeMarket(betId: UInt64) {
    let theBet = (await this.totalBets.get(betId)).value;
    assert(this.network.block.height.value.greaterThan(theBet.endingTimestamp.value), "Bet is not yet over");
    theBet.isOver = Bool(true);
    theBet.result = Bool(true); // Placeholder for oracle integration
    await this.totalBets.set(betId, theBet);
  }

  @runtimeMethod()
  public async claimWinnings(betId: UInt64, address: PublicKey) {
    let theBet = (await this.totalBets.get(betId)).value;
    assert(theBet.isOver, "The bet is not closed yet");
    let stakedIds = new StakedId({ betId: betId, publicKey: this.transaction.sender.value });
    let amountToSend = (await this.stakedToYes.get(stakedIds)).value;
    const tokenId = TokenId.from(0);

    await this.balances.mint(tokenId, address, amountToSend );

  }
}