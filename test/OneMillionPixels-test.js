import assertRevert from './helpers/assertRevert';
const BigNumber = web3.BigNumber;
const OneMillionPixels = artifacts.require('OneMillionPixels.sol');

require('chai').use(require('chai-as-promised'))
  				.use(require('chai-bignumber')(BigNumber))
				.should();

contract('OneMillionPixels', accounts => {
	const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

	const owner = accounts[0];
	const userOne = accounts[1];
	const userTwo = accounts[2];
	const otherUser = accounts[3];

	var token;

	const tokenOne = 1;
	const tokenTwo = 2;
	const otherToken = 500;

	// Because the base ERC 721 doesn't have a mint functionnality, we can't really test it on its own without the
	// ability to buy the token that the OneMillionPixels smart contract allows us
	beforeEach(async function () {
	    token = await OneMillionPixels.new({ from: owner });
	    await token.initialBuyToken(tokenOne, {from: userOne, value: web3.toWei(100, "finney") });
	});

	// -----------------------------------------------------------------------------------------------------------
    // ---------------------------------------------- Simple ERC 721 tests ---------------------------------------
    // -----------------------------------------------------------------------------------------------------------

  	describe('totalSupply', function () {
	    it('has an initial total supply equal to one', async function () {
	      const totalSupply = await token.totalSupply();
	      totalSupply.should.be.bignumber.equal(1);
	    });
	});

	describe('balanceOf', function () {
	    describe('when the given address owns some tokens', function () {
			it('returns the amount of tokens owned by the given address', async function () {
				const balance = await token.balanceOf(userOne);
				balance.should.be.bignumber.equal(1);
			});
		});

		describe('when the given address does not own any tokens', function () {
			it('returns 0', async function () {
				const balance = await token.balanceOf(userTwo);
				balance.should.be.bignumber.equal(0);
			});
		});
	});

	describe('ownerOf', function () {
	    describe('when the given token ID was tracked by this token', function () {
			const tokenId = tokenOne;

			it('returns the owner of the given token ID', async function () {
				const ownerOf = await token.ownerOf(tokenId);
				ownerOf.should.be.equal(userOne);
			});
	    });
	});

	describe('transfer', function () {
		describe('when the address to transfer the token to is not the zero address', function () {
			describe('when the msg.sender is the owner of the given token ID', function () {
				const sender = userOne;
				const to = userTwo;
				const tokenId = tokenOne;
				const someoneElse = otherUser;

				it('transfers the ownership of the given token ID to the given address', async function () {
					await token.transfer(to, tokenId, { from: sender });

					const newOwner = await token.ownerOf(tokenId);
					newOwner.should.be.equal(to);
				});
				
				it('clears the approval for the token ID', async function () {
					await token.approve(someoneElse, tokenId, { from: sender });

					await token.transfer(to, tokenId, { from: sender });

					const approvedAccount = await token.approvedFor(tokenId);
					approvedAccount.should.be.equal(ZERO_ADDRESS);
				});
				
				it('emits a transfer event', async function () {
					const { logs } = await token.transfer(to, tokenId, { from: sender });

					logs.length.should.be.equal(1);

					logs[0].event.should.be.eq('Transfer');
					logs[0].args._from.should.be.equal(sender);
					logs[0].args._to.should.be.equal(to);
					logs[0].args._tokenId.should.be.bignumber.equal(tokenId);
				});
				
				it('adjusts owners balances', async function () {
					const previousBalance = await token.balanceOf(sender);
					await token.transfer(to, tokenId, { from: sender });

					const newOwnerBalance = await token.balanceOf(to);
					newOwnerBalance.should.be.bignumber.equal(1);

					const previousOwnerBalance = await token.balanceOf(sender);
					previousOwnerBalance.should.be.bignumber.equal(previousBalance - 1);
				});
				
				it('adds the token to the tokens list of the new owner', async function () {
					await token.transfer(to, tokenId, { from: sender });

					const tokenIDs = await token.tokensOf(to);
					tokenIDs.length.should.be.equal(1);
					tokenIDs[0].should.be.bignumber.equal(tokenId);
				});
			});

			describe('when the msg.sender is not the owner of the given token ID', function () {
				const sender = otherUser;
				const to = userTwo;
				const tokenId = tokenOne;

				it('reverts', async function () {
					await assertRevert(token.transfer(to, tokenId, { from: sender }));
				});
			});
		});

		describe('when the address to transfer the token to is the zero address', function () {
			const to = ZERO_ADDRESS;
			const sender = userOne;
			const tokenId = tokenOne;

			it('reverts', async function () {
				await assertRevert(token.transfer(to, tokenId, { from: sender }));
			});
		});
	});

	describe('approve', function () {
		describe('when the sender owns the given token ID', function () {
			const sender = userOne;
			const to = userTwo;
			const tokenId = tokenOne;
			const someoneElse = otherUser;

			describe('when the address that receives the approval is the 0 address', function () {
				describe('when there was no approval for the given token ID before', function () {
					it('adds the approval for that token', async function () {
						await token.approve(to, tokenId, { from: sender });

						const approvedAccount = await token.approvedFor(tokenId);
						approvedAccount.should.be.equal(to);
		            });

		            it('does emit an approval event', async function () {
						const { logs } = await token.approve(to, tokenId, { from: sender });

						logs.length.should.be.equal(1);
					});
				});

				describe('when the given token ID was approved for another account', function () {
					beforeEach(async function () {
						await token.approve(someoneElse, tokenId, { from: sender });
					});

					it('clears the approval for the token ID', async function () {
						await token.approve(to, tokenId, { from: sender });

						const approvedAccount = await token.approvedFor(tokenId);
						approvedAccount.should.be.equal(to);
					});

					it('emits an approval event', async function () {
						const { logs } = await token.approve(to, tokenId, { from: sender });

						logs.length.should.be.equal(1);
						logs[0].event.should.be.eq('Approval');
						logs[0].args._owner.should.be.equal(sender);
						logs[0].args._approved.should.be.equal(to);
						logs[0].args._tokenId.should.be.bignumber.equal(tokenId);
					});
				});

				describe('when the address that receives the approval is not the 0 address', function () {
					describe('when the address that receives the approval is different than the owner', function () {
						describe('when there was no approval for the given token ID before', function () {
							it('approves the token ID to the given address', async function () {
								await token.approve(to, tokenId, { from: sender });

								const approvedAccount = await token.approvedFor(tokenId);
								approvedAccount.should.be.equal(to);
							});

							it('emits an approval event', async function () {
								const { logs } = await token.approve(to, tokenId, { from: sender });

								logs.length.should.be.equal(1);
								logs[0].event.should.be.eq('Approval');
								logs[0].args._owner.should.be.equal(sender);
								logs[0].args._approved.should.be.equal(to);
								logs[0].args._tokenId.should.be.bignumber.equal(tokenId);
							});
						});

						describe('when the given token ID was approved for the same account', function () {
							beforeEach(async function () {
								await token.approve(to, tokenId, { from: sender });
							});

							it('keeps the approval to the given address', async function () {
								await token.approve(to, tokenId, { from: sender });

								const approvedAccount = await token.approvedFor(tokenId);
								approvedAccount.should.be.equal(to);
							});

							it('emits an approval event', async function () {
								const { logs } = await token.approve(to, tokenId, { from: sender });

								logs.length.should.be.equal(1);
								logs[0].event.should.be.eq('Approval');
								logs[0].args._owner.should.be.equal(sender);
								logs[0].args._approved.should.be.equal(to);
								logs[0].args._tokenId.should.be.bignumber.equal(tokenId);
							});
						});
					});

					describe('when the address that receives the approval is the owner', function () {
						const anotherTo = sender;

						describe('when there was no approval for the given token ID before', function () {
							it('reverts', async function () {
								await assertRevert(token.approve(anotherTo, tokenId, { from: sender }));
							});
						});

						describe('when the given token ID was approved for another account', function () {
							beforeEach(async function () { 
								await token.approve(accounts[2], tokenId, { from: sender });
							});

							it('reverts', async function () {
								await assertRevert(token.approve(anotherTo, tokenId, { from: sender }));
							});
						});
					});
				});
			});
		});

		describe('when the sender does not own the given token ID', function () {
			const sender = userOne;
			const to = userTwo;
			const tokenId = tokenOne;
			const someoneElse = otherUser;

			it('reverts', async function () {
				await assertRevert(token.approve(to, tokenId, { from: someoneElse }));
			});
		});
	});

	describe('transferFrom', function () {
		describe('when the sender has the approval for the token ID', function () {
			const sender = userOne;
			const to = userTwo;
			const tokenId = tokenOne;
			const someoneElse = otherUser;

			beforeEach(async function () {
				await token.approve(to, tokenId, { from: sender });
			});

			it('can transfer the token on behalf of the last owner', async function () {
				await token.transferFrom(someoneElse, tokenId, { from: to });

				const newOwner = await token.ownerOf(tokenId);
				newOwner.should.be.equal(someoneElse);
			});

			it('clears the approval for the token ID', async function () {
				await token.transferFrom(someoneElse, tokenId, { from: to });

				const approvedAccount = await token.approvedFor(tokenId);
				approvedAccount.should.be.equal(ZERO_ADDRESS);
			});

			it('emits a transfer event', async function () {
				const { logs } = await token.transferFrom(someoneElse, tokenId, { from: to });

				logs.length.should.be.equal(1);

				logs[0].event.should.be.eq('Transfer');
				logs[0].args._from.should.be.equal(sender);
				logs[0].args._to.should.be.equal(someoneElse);
				logs[0].args._tokenId.should.be.bignumber.equal(tokenId);
			});

			it('adjusts owners balances', async function () {
				const previousBalance = await token.balanceOf(sender);

				await token.transferFrom(someoneElse, tokenId, { from: to });

				const newOwnerBalance = await token.balanceOf(someoneElse);
				newOwnerBalance.should.be.bignumber.equal(1);

				const previousOwnerBalance = await token.balanceOf(sender);
				previousOwnerBalance.should.be.bignumber.equal(previousBalance - 1);
			});

			it('adds the token to the tokens list of the new owner', async function () {
				await token.transferFrom(someoneElse, tokenId, { from: to });

				const tokenIDs = await token.tokensOf(someoneElse);
				tokenIDs.length.should.be.equal(1);
				tokenIDs[0].should.be.bignumber.equal(tokenId);
			});
		});

		describe('when the sender does not have an approval for the token ID', function () {
			const sender = userOne;
			const to = userTwo;
			const tokenId = tokenOne;
			const someoneElse = otherUser;

			it('reverts', async function () {
				await assertRevert(token.transferFrom(someoneElse, tokenId, { from: to }));
			});
		});

		describe('when the sender wants to transferFrom', function () {
			const sender = userOne;
			const someoneElse = otherUser;
			const tokenId = tokenOne;

			it('reverts', async function () {
				await assertRevert(token.transferFrom(someoneElse, tokenId, { from: sender }));
			});
		});
	});

	describe('removeApproval', function () {
		describe('when the sender owns the given token ID', function () {
			const sender = userOne;
			const to = userTwo;
			const tokenId = tokenOne;
			const someoneElse = otherUser;

			beforeEach(async function () {
				await token.approve(someoneElse, tokenId, { from: sender });
			});

			it('removes the approval', async function () {
				await token.removeApproval(tokenId, { from: sender });

				const approvedAccount = await token.approvedFor(tokenId);
				approvedAccount.should.be.equal(ZERO_ADDRESS);
	        });

			it('emits an approval event', async function () {
				const { logs } = await token.removeApproval(tokenId, { from: sender });

				logs.length.should.be.equal(1);
				logs[0].event.should.be.eq('Approval');
				logs[0].args._owner.should.be.equal(sender);
				logs[0].args._approved.should.be.equal(ZERO_ADDRESS);
				logs[0].args._tokenId.should.be.bignumber.equal(tokenId);
			});
		});

		describe('when the sender doesn\'t own the given token ID', function () {
			const sender = userOne;
			const to = userTwo;
			const tokenId = tokenOne;
			const someoneElse = otherUser;

			it('cannot remove approval', async function () {
				it('reverts', async function () {
					await assertRevert(await token.removeApproval(tokenId, { from: someoneElse }));
				});
	        });
		});
	})

	// -----------------------------------------------------------------------------------------------------------
    // --------------------------------------------- OneMillionPixels tests --------------------------------------
    // -----------------------------------------------------------------------------------------------------------

	describe('initialBuyToken', function () {
		const sender = userTwo;
		const tokenId = tokenTwo;
		const someoneElse = otherUser;

		describe('when no one owns the token already', function () {
			it('can buy the token', async function () {
				await token.initialBuyToken(tokenId, {from: sender, value: web3.toWei(100, "finney")});

				const ownerOf = await token.ownerOf(tokenId);
				ownerOf.should.be.equal(sender);
			});

			it('emits event', async function () {
				const { logs } = await token.initialBuyToken(tokenId, {from: sender, value: web3.toWei(100, "finney")});

				logs.length.should.be.equal(1);

				logs[0].event.should.be.eq('EmitBought');
				logs[0].args._by.should.be.equal(sender);
				logs[0].args._at.should.be.bignumber.equal(web3.toWei(100, "finney"));
				logs[0].args._tokenId.should.be.bignumber.equal(tokenId);
			});
			
			it('appears on new owner balance', async function () {
				const previousBalance = await token.balanceOf(sender);
				
				await token.initialBuyToken(tokenId, {from: sender, value: web3.toWei(100, "finney")});

				const newBalance = await token.balanceOf(sender);
				newBalance.should.be.bignumber.equal(previousBalance + 1);
			});

			it('adds the token to the tokens list of the new owner', async function () {
				await token.initialBuyToken(tokenId, {from: sender, value: web3.toWei(100, "finney")});

				const tokenIDs = await token.tokensOf(sender);
				tokenIDs.length.should.be.equal(1);
				tokenIDs[0].should.be.bignumber.equal(tokenId);
			});

			it('adds to total supply', async function () {
				await token.initialBuyToken(tokenId, {from: sender, value: web3.toWei(100, "finney")});

				const totalSupply = await token.totalSupply();
	      		totalSupply.should.be.bignumber.equal(2);
			});
		});

		describe('when someone already owns the token', function () {
			it('cannot buy the token', async function () {
				await token.initialBuyToken(tokenId, {from: sender, value: web3.toWei(100, "finney")});

				await assertRevert(token.initialBuyToken(tokenId, {from: someoneElse, value: web3.toWei(100, "finney")}));
			});
		});
	});

	describe('sellToken', function () {
		const sender = userOne;
		const tokenId = tokenOne;
		const someoneElse = otherUser;

		describe('when the sender owns the given token ID', function () {
			it('can put it up for sale', async function () {
				await token.sellToken(tokenId, web3.toWei(123, "finney"), { from: sender });

				const sellingPrice = await token.tokenToSalePrice(tokenId);
				sellingPrice.should.be.bignumber.equal(web3.toWei(123, "finney"));
			});

			it('emits event', async function () {
				const { logs } = await token.sellToken(tokenId, web3.toWei(123, "finney"), { from: sender });

				logs.length.should.be.equal(1);

				logs[0].event.should.be.eq('EmitUpForSale');
				logs[0].args._price.should.be.bignumber.equal(web3.toWei(123, "finney"));
				logs[0].args._tokenId.should.be.bignumber.equal(tokenId);
			});

			it('remains in the seller ownership', async function () {
				await token.sellToken(tokenId, web3.toWei(123, "finney"), { from: sender });

				const tokenIDs = await token.tokensOf(sender);
				tokenIDs.length.should.be.equal(1);
				tokenIDs[0].should.be.bignumber.equal(tokenId);
			});
		});
		describe('when the sender doesn\'t own the given token ID', function () {
			it('cannot sell', async function () {
				await assertRevert(token.sellToken(tokenId, web3.toWei(123, "finney"), { from: someoneElse }));
			});
		});
	});

	describe('buyToken', function () {
		const seller = userOne;
		const buyer = userTwo;
		const tokenId = tokenOne;
		const someoneElse = otherUser;

		describe('when the buyer is not the owner', function () {
			beforeEach(async function () {
				await token.sellToken(tokenId, web3.toWei(123, "finney"), { from: seller });
			});

			it('can buy', async function () {
				await token.buyToken(tokenId, { from: buyer, value:  web3.toWei(123, "finney")});

				const ownerOf = await token.ownerOf(tokenId);
				ownerOf.should.be.equal(buyer);
			});

			it('adjusts owners balances', async function () {
				const previousBalance = await token.balanceOf(seller);
				await token.buyToken(tokenId, { from: buyer, value:  web3.toWei(123, "finney")});

				const newOwnerBalance = await token.balanceOf(buyer);
				newOwnerBalance.should.be.bignumber.equal(1);

				const previousOwnerBalance = await token.balanceOf(seller);
				previousOwnerBalance.should.be.bignumber.equal(previousBalance - 1);
			});

			it('emits a buying event', async function () {
				const { logs } = await token.buyToken(tokenId, { from: buyer, value:  web3.toWei(123, "finney")});

				logs.length.should.be.equal(1);

				logs[0].event.should.be.eq('EmitBought');
				logs[0].args._by.should.be.equal(buyer);
				logs[0].args._at.should.be.bignumber.equal(web3.toWei(123, "finney"));
				logs[0].args._tokenId.should.be.bignumber.equal(tokenId);
			});

			it('removes approval', async function () {
				await token.approve(someoneElse, tokenId, { from: seller });

				const approvedAccount = await token.approvedFor(tokenId);
				approvedAccount.should.be.equal(someoneElse);

				await token.buyToken(tokenId, { from: buyer, value:  web3.toWei(123, "finney")});

				const newApprovedAccount = await token.approvedFor(tokenId);
				newApprovedAccount.should.be.equal(ZERO_ADDRESS);

				await assertRevert(token.transferFrom(seller, tokenId, { from: someoneElse }));
			});
		});
		describe('when the buyer is the owner', function () {
			it('cannot buy the token from themselves', async function () {
				await assertRevert(token.buyToken(tokenId, { from: seller, value:  web3.toWei(123, "finney")}));
			});
		});
	});

	describe('removeTokenFromSale', function () {
		const seller = userOne;
		const buyer = userTwo;
		const tokenId = tokenOne;
		const someoneElse = otherUser;

		beforeEach(async function () {
			await token.sellToken(tokenId, web3.toWei(123, "finney"), { from: seller });
		});

		describe('when the sender owns the given token ID', function () {
			it('removes the sale', async function () {
				const sellingPrice = await token.tokenToSalePrice(tokenId);
				sellingPrice.should.be.bignumber.equal(web3.toWei(123, "finney"));

				await token.removeTokenFromSale(tokenId, { from: seller });

				const newSellingPrice = await token.tokenToSalePrice(tokenId);
				newSellingPrice.should.be.bignumber.equal(0);
			});

			it('no one can buy it now', async function () {
				await token.removeTokenFromSale(tokenId, { from: seller });

				await assertRevert(token.buyToken(tokenId, { from: buyer, value:  web3.toWei(123, "finney")}));
			});

			it('emits a remove auction event', async function () {
				const { logs } = await token.removeTokenFromSale(tokenId, { from: seller });

				logs.length.should.be.equal(1);

				logs[0].event.should.be.eq('EmitSaleOfferRemoved');
				logs[0].args._tokenId.should.be.bignumber.equal(tokenId);
			});

			it('approval remains', async function () {
				await token.approve(someoneElse, tokenId, { from: seller });

				await token.removeTokenFromSale(tokenId, { from: seller });

				const approvedAccount = await token.approvedFor(tokenId);
				approvedAccount.should.be.equal(someoneElse);
			});
		});

		describe('when the sender doesn\'t own the given token ID', function () {
			it('cannot remove it from sale', async function () {
				await assertRevert(token.removeTokenFromSale(tokenId, { from: someoneElse }));
			});
		});
	});

	describe('transfer, approve, and transferFrom after a sale', function () {
		const seller = userOne;
		const buyer = userTwo;
		const tokenId = tokenOne;
		const someoneElse = otherUser;

		beforeEach(async function () {
			await token.sellToken(tokenId, web3.toWei(123, "finney"), { from: seller });
		});

		describe('transfer', function () {
			it('old owner cannot transfer after sale', async function () {
				await token.buyToken(tokenId, { from: buyer, value:  web3.toWei(123, "finney")});

				await assertRevert(token.transfer(someoneElse, tokenId, { from: seller }));
			});

			it('new owner can transfer after buying', async function () {
				await token.buyToken(tokenId, { from: buyer, value:  web3.toWei(123, "finney")});

				await token.transfer(someoneElse, tokenId, { from: buyer });

				const newOwner = await token.ownerOf(tokenId);
				newOwner.should.be.equal(someoneElse);
			});

			it('removes the sale offer after a transfer', async function () {
				const sellingPrice = await token.tokenToSalePrice(tokenId);
				sellingPrice.should.be.bignumber.equal(web3.toWei(123, "finney"));

				await token.transfer(someoneElse, tokenId, { from: seller });

				const newSellingPrice = await token.tokenToSalePrice(tokenId);
				newSellingPrice.should.be.bignumber.equal(0);

				await assertRevert(token.buyToken(tokenId, { from: buyer, value:  web3.toWei(123, "finney")}));
			});
		});

		describe('approve', function () {
			it('old owner cannot approve after sale', async function () {
				await token.buyToken(tokenId, { from: buyer, value:  web3.toWei(123, "finney")});

				await assertRevert(token.approve(someoneElse, tokenId, { from: seller }));
			});

			it('new owner can approve after buying', async function () {
				await token.buyToken(tokenId, { from: buyer, value:  web3.toWei(123, "finney")});

				await token.approve(someoneElse, tokenId, { from: buyer });

				const approvedAccount = await token.approvedFor(tokenId);
				approvedAccount.should.be.equal(someoneElse);
			});
		});

		describe('transferFrom', function () {
			const anotherActor = accounts[7];
			it('removes the sale offer after a transferFrom', async function () {
				const sellingPrice = await token.tokenToSalePrice(tokenId);
				sellingPrice.should.be.bignumber.equal(web3.toWei(123, "finney"));

				await token.approve(someoneElse, tokenId, { from: seller });

				await token.transferFrom(anotherActor, tokenId, { from: someoneElse });

				const newSellingPrice = await token.tokenToSalePrice(tokenId);
				newSellingPrice.should.be.bignumber.equal(0);

				await assertRevert(token.buyToken(tokenId, { from: buyer, value:  web3.toWei(123, "finney")}));
			});
		});
	});

	describe('withdraw', function () {
		describe('contract owner after a token is bought during the initial auction', function () {
			it('has a balance of 100 finneys', async function () {
				const balance = await token.BalanceOfEther(owner);
				balance.should.be.bignumber.equal(web3.toWei(100, "finney"));
			});

			it('will be able to withdraw the 100 finneys', async function () {
				// we get the post first initial sell balance of the owner in the smart contract
				const balanceInSmartContract = await token.BalanceOfEther(owner);
				balanceInSmartContract.should.be.bignumber.equal(web3.toWei(100, "finney"));

				// we get the initial balance of the owner pre withdraw
				let initialBalance = web3.eth.getBalance(owner);

				// owner performs the  withdraw
				let withdrawal = await token.withdraw({from: owner});

				// we get the current balance
				let newBalance = web3.eth.getBalance(owner);

				// we get the gas cost for the withdrawal transaction
				let gasCost = getTransactionGasCost(withdrawal["tx"]);

				// we remove the initial balance from the new balance => should equal (100 finneys - gas usage for withdraw)
				newBalance = newBalance.minus(initialBalance);

				var howMuchShouldReceive = new BigNumber(web3.toWei(100, "finney"));
				howMuchShouldReceive = howMuchShouldReceive.minus(gasCost);

				newBalance.should.be.bignumber.equal(howMuchShouldReceive);


				// we get the new balance of the owner in the smart contract
				const newBalanceInSmartContract = await token.BalanceOfEther(owner);
				newBalanceInSmartContract.should.be.bignumber.equal(0);
			});
		});

		describe('someone else after the token is bought during the initial auction', function () {
			const someoneElse = otherUser;

			it('will not be able to withdraw the 100 finneys', async function () {
				// we get the post first initial sell balance of the owner in the smart contract
				const balanceInSmartContract = await token.BalanceOfEther(owner);
				balanceInSmartContract.should.be.bignumber.equal(web3.toWei(100, "finney"));

				let initialBalance = web3.eth.getBalance(someoneElse);

				let withdrawal = await token.withdraw({from: someoneElse});

				let newBalance = web3.eth.getBalance(someoneElse);

				let gasCost = getTransactionGasCost(withdrawal["tx"]);

				newBalance = newBalance.minus(initialBalance);

				var howMuchShouldReceive = new BigNumber(0);
				howMuchShouldReceive = howMuchShouldReceive.minus(gasCost);

				newBalance.should.be.bignumber.equal(howMuchShouldReceive);

				// we get the new balance of the owner in the smart contract
				const newBalanceInSmartContract = await token.BalanceOfEther(owner);
				newBalanceInSmartContract.should.be.bignumber.equal(web3.toWei(100, "finney"));
			});
		});

		describe('someone sells an artwork', function () {
			const seller = userOne;
			const buyer = userTwo;
			const tokenId = tokenOne;
			const someoneElse = otherUser;

			beforeEach(async function () {
				await token.sellToken(tokenId, web3.toWei(123, "finney"), { from: seller });

				await token.buyToken(tokenId, { from: buyer, value:  web3.toWei(123, "finney")});
			});

			it('owner will get only their balance', async function () {
				// we get the post first initial sell balance of the owner in the smart contract
				const balanceInSmartContract = await token.BalanceOfEther(owner);
				balanceInSmartContract.should.be.bignumber.equal(web3.toWei(100, "finney"));

				// we get the initial balance of the owner pre withdraw
				let initialBalance = web3.eth.getBalance(owner);

				// owner performs the  withdraw
				let withdrawal = await token.withdraw({from: owner});

				// we get the current balance
				let newBalance = web3.eth.getBalance(owner);

				// we get the gas cost for the withdrawal transaction
				let gasCost = getTransactionGasCost(withdrawal["tx"]);

				// we remove the initial balance from the new balance => should equal (100 finneys - gas usage for withdraw)
				newBalance = newBalance.minus(initialBalance);

				var howMuchShouldReceive = new BigNumber(web3.toWei(100, "finney"));
				howMuchShouldReceive = howMuchShouldReceive.minus(gasCost);

				newBalance.should.be.bignumber.equal(howMuchShouldReceive);


				// we get the new balance of the owner in the smart contract
				const newBalanceInSmartContract = await token.BalanceOfEther(owner);
				newBalanceInSmartContract.should.be.bignumber.equal(0);

				// we get the new balance of the owner in the smart contract
				const newBalanceInSmartContractSeller = await token.BalanceOfEther(seller);
				newBalanceInSmartContractSeller.should.be.bignumber.equal(web3.toWei(123, "finney"));
			});

			it('seller will get only their balance', async function () {
				// we get the post first initial sell balance of the seller in the smart contract
				const balanceInSmartContract = await token.BalanceOfEther(seller);
				balanceInSmartContract.should.be.bignumber.equal(web3.toWei(123, "finney"));

				// we get the initial balance of the seller pre withdraw
				let initialBalance = web3.eth.getBalance(seller);

				// seller performs the  withdraw
				let withdrawal = await token.withdraw({from: seller});

				// we get the current balance
				let newBalance = web3.eth.getBalance(seller);

				// we get the gas cost for the withdrawal transaction
				let gasCost = getTransactionGasCost(withdrawal["tx"]);

				// we remove the initial balance from the new balance => should equal (123 finneys - gas usage for withdraw)
				newBalance = newBalance.minus(initialBalance);

				var howMuchShouldReceive = new BigNumber(web3.toWei(123, "finney"));
				howMuchShouldReceive = howMuchShouldReceive.minus(gasCost);

				newBalance.should.be.bignumber.equal(howMuchShouldReceive);


				// we get the new balance of the seller in the smart contract
				const newBalanceInSmartContract = await token.BalanceOfEther(seller);
				newBalanceInSmartContract.should.be.bignumber.equal(0);

				// we get the new balance of the owner in the smart contract
				const newBalanceInSmartContractSeller = await token.BalanceOfEther(owner);
				newBalanceInSmartContractSeller.should.be.bignumber.equal(web3.toWei(100, "finney"));
			});
		});
	});


	describe('setTokenPixelsColors', function () {
		const aColorsSet = "109D3C6A80476A1D6AE8E9ED0251A6DD4FFC008F676435D86CAD5CB107D9407958B86E94A11922FB614769DF142AA39ED27F5CA165DC6F2F922BED557F2DDED6CAA0CECA2B8C70EA4D79351BEB0F39587205E091144272B5714328741394DA368F04B907FAC17A14B128774CC2C25BA311721B19B2DC422E105D37C82C2750B3E335DABCF9812879D9A5CDCC41842F1118E24F1713B846ED074B69629B855B0132FC7BDC998DA7956DB7727F413E845A93586717AF21846CE6BFF6142B4844BB45694058301E8E5AEEB1ACF9357A3E4C0E13855E8558CEB559A2F3439EFD2CC83135FE0009818CD7816D277791A09A624F3F06788535D8074049DB45E83F9F1353233B879F7A172D4BF9A91FBA18C7E31F95BACC7A42674FEB640A6D1D6CC278F257AA7AF6E7ED89532F7037";

		const sender = userOne;
		const tokenId = tokenOne;
		const someoneElse = otherUser;

		describe('when the sender owns the given token ID', function () {
			it('can change the pixels colors', async function () {
				await token.setTokenPixelsColors(tokenId, aColorsSet, { from: sender });

				const actualPixelsColors = await token.tokenToPixelsColors(tokenId);
				actualPixelsColors.should.be.equal(aColorsSet);
			});
		});

		describe('when the sender doesn\'t own the given token ID', function () {
			it('cannot change the pixels colors', async function () {
				await assertRevert(token.setTokenPixelsColors(tokenId, aColorsSet, { from: someoneElse }));
			});
		});
	});

	describe('setTokenDescription', function () {
		const aDescription = "This a a description for the token.";

		const sender = userOne;
		const tokenId = tokenOne;
		const someoneElse = otherUser;

		describe('when the sender owns the given token ID', function () {
			it('can change the description', async function () {
				await token.setTokenDescription(tokenId, aDescription, { from: sender });

				const actualDescription = await token.tokenToDescription(tokenId);
				actualDescription.should.be.equal(aDescription);
			});
		});

		describe('when the sender doesn\'t own the given token ID', function () {
			it('cannot change the description', async function () {
				await assertRevert(token.setTokenDescription(tokenId, aDescription, { from: someoneElse }));
			});
		});
	});
	
	describe('setTokenLink', function () {
		const aLink = "https://www.thisAnExampleLink.com/";

		const sender = userOne;
		const tokenId = tokenOne;
		const someoneElse = otherUser;

		describe('when the sender owns the given token ID', function () {
			it('can change the link', async function () {
				await token.setTokenLink(tokenId, aLink, { from: sender });

				const actualPixelsColors = await token.tokenToLink(tokenId);
				actualPixelsColors.should.be.equal(aLink);
			});
		});

		describe('when the sender doesn\'t own the given token ID', function () {
			it('cannot change the link', async function () {
				await assertRevert(token.setTokenLink(tokenId, aLink, { from: someoneElse }));
			});
		});
	});
});

// Calculates a transaction gas usage
function getTransactionGasCost(tx) {
  let transaction = web3.eth.getTransactionReceipt(tx);
  let amount = transaction.gasUsed;
  let price = web3.eth.getTransaction(tx).gasPrice;
 
  return new BigNumber(price * amount);
}