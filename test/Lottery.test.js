const assert = require('assert');
const Web3 = require('web3');
const ganache = require('ganache-cli');
const { bytecode, interface } = require('../compile');

const web3 = new Web3(ganache.provider());
let accounts;
let lottery;
beforeEach(async () => {
  accounts = await web3.eth.getAccounts();
  lottery = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({ data: bytecode })
    .send({ from: accounts[0], gas: '1000000' });
});

describe('Lottery Contract', () => {
  it('deploys a contract', () => {
    assert.ok(lottery.options.address);
  });

  it('allows one account to enter', async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      //web3.utils.toWei() converts ether to wei
      value: web3.utils.toWei('0.0002', 'ether'),
    });
    const players = await lottery.methods
      .getPlayers()
      .call({ from: accounts[0] });

    assert.equal(accounts[0], players[0]);
    assert.equal(1, players.length);
  });

  it('allow multiple accounts to enter', async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('0.0002', 'ether'),
    });
    await lottery.methods.enter().send({
      from: accounts[1],
      value: web3.utils.toWei('0.0002', 'ether'),
    });
    await lottery.methods.enter().send({
      from: accounts[2],
      value: web3.utils.toWei('0.0002', 'ether'),
    });
    const players = await lottery.methods
      .getPlayers()
      .call({ from: accounts[0] });

    assert.equal(accounts[0], players[0]);
    assert.equal(accounts[1], players[1]);
    assert.equal(accounts[2], players[2]);

    assert.equal(3, players.length);
  });
  it('requires a minimum amount of ether to enter', async () => {
    try {
      //we are checking if by sending less money our test is failing or not
      //200 wei is way below the ether that is required to enter into the lottery
      await lottery.methods.enter().send({ from: accounts[0], value: 200 }); //200wei
      //we have written below statement because we want our test to fail if it is not failing if we send money less than the minimum limit
      assert(false); //if control comes to this line, automatically fail the test no matter what
    } catch (err) {
      assert(err);
    }
  });
  it('only manager can call pickWinner', async () => {
    try {
      await lottery.methods.pickWinner().send({
        from: account[1],
      });
      assert(false);
    } catch (err) {
      assert(err);
    }
  });

  it('sends money to the winner and resets the players array', async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('2', 'ether'),
    });

    const initialBalance = await web3.eth.getBalance(accounts[0]);

    await lottery.methods.pickWinner().send({
      from: accounts[0],
    });

    const finalBalance = await web3.eth.getBalance(accounts[0]);

    const balanceDifference = finalBalance - initialBalance;
    // console.log(balanceDifference);
    assert(balanceDifference > web3.utils.toWei('1.8', 'ether'));
    //tetsing if the players array got empty after picking the winner
    const players = await lottery.methods.getPlayers().call();
    assert.equal(0, players.length);

    //testing if the overall contract balance became 0 or not after giving all the amount to the winner
    const contractBalance = await web3.eth.getBalance(lottery.options.address);
    assert.equal(0, contractBalance);
  });
});
