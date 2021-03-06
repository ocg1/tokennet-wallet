import React, { Component } from 'react';
import ModalContainer from './ModalContainer';
import BlueButton from 'components/BlueButton';
import './TransactionConfirm.scss';
import { connect } from "react-redux";
import * as actions from "actions/index";
import T from 'i18n-react';
import numeral from 'numeral';
import * as StellarToolkit from 'libs/stellar-toolkit/index';
import async from 'async';
import { find } from 'underscore';
import AmountSpan from "components/AmountSpan";
import ErrorPopup from "./ErrorPopup";

const { StellarOperations } = StellarToolkit;
const config = require( 'config.json' );

class TransactionConfirm extends Component {
	constructor() {
		super();

		this.state = {
			error: null,
		};
	}
	showSendComplete = () => {
		this.props.showSpinner( true );

		const queue = [];
		queue.push( $callback => {
			StellarOperations.sendPayment( this.props.paymentData )( this.props.keypair )
				.then( () => {
					$callback( null, false );
				} )
				.catch( ( $error ) => {
					const noDestination = find( $error.extras.result_codes.operations, $item => $item === 'op_no_destination' );
					if ( noDestination ) {
						$callback( null, $error );
						return;
					}
					$callback( $error );
				} );
		} );
		queue.push( ( $extras, $callback ) => {
			if ( $extras ) {
				StellarOperations.createAccount( this.props.paymentData )( this.props.keypair )
					.then( () => {
						$callback();
					} )
					.catch( ( $error ) => {
						$callback( $error );
					} );
			}
			else {
				$callback();
			}
		} );

		async.waterfall( queue, ( $error, $result ) => {
			if ( $error ) {
				this.props.showSpinner( false );
				this.props.transactionComplete( false, null );
				this.props.transactionConfirm( false, null );
				this.setState( { error: $error } );
			}
			else {
				this.props.showSpinner( false );
				this.props.transactionComplete( true, this.props.paymentData );
				this.props.transactionConfirm( false, null );
			}
		} );

	};

	hideTransactionConfirm = () => {
		this.props.transactionConfirm( false, null );
	};

	render() {
		let amount = 0;
		let total = 0;
		if ( this.props.paymentData ) {
			amount = numeral( this.props.paymentData.amount ).format( '0,0.0000[00000000]' );
			total = numeral( this.props.paymentData.transactionTotal ).format( '0,0.0000[00000000]' );
		}
		return (
			<ModalContainer modalOpen={this.props.modalOpen} doClose={this.hideTransactionConfirm}>
				{ this.state.error &&
				<ErrorPopup>
					<h2 className="text-center">Error</h2>
					<p>Error Code</p>
					<pre>{ this.state.error.extras.result_codes.transaction }</pre>
					<p>Code</p>
					<pre>{ JSON.stringify( this.state.error.extras.result_codes, null, 2 ) }</pre>
					<div className={ 'text-center'}>
						<BlueButton onClick={ () => this.setState( { error: null } ) }>{ T.translate( 'common.close' ) }</BlueButton>
					</div>
				</ErrorPopup>
				}
				<div className="transaction-confirm-container">
					<h1>
						{T.translate( "transaction_confirm.header" )}
					</h1>
					<span className="under-line"></span>
					<p>
						{T.translate( "transaction_confirm.text" )}
					</p>
					<div className="transaction-box">
						<table>
							<tbody>
							<tr>
								<td>
									{T.translate( "common.public_address" )}
								</td>
								<td>
									{this.props.paymentData ? this.props.paymentData.destination : ''}
								</td>
							</tr>
							<tr>
								<td>{T.translate( "common.amount" )}</td>
								<td>
									<AmountSpan value={ amount }/> BOS
								</td>
							</tr>
							<tr>
								<td>{T.translate( "common.transaction_fee" )}</td>
								<td>
									<AmountSpan value={ config.transaction_fee }/> BOS
								</td>
							</tr>
							<tr>
								<td>
									{T.translate( "common.total_amount" )}
								</td>
								<td>
									<AmountSpan value={ total }/> BOS
								</td>
							</tr>
							</tbody>
						</table>
					</div>
					<p className="button-wrapper">
						<BlueButton medium onClick={this.showSendComplete}>{T.translate( "common.send" )}</BlueButton>
						<BlueButton medium
									onClick={this.hideTransactionConfirm}>{T.translate( "common.cancel" )}</BlueButton>
					</p>
				</div>
			</ModalContainer>
		)
	}
}

const mapStoreToProps = ( store ) => ({
	keypair: store.keypair.keypair,
	paymentData: store.transactionConfirm.paymentData,
});

const mapDispatchToProps = ( dispatch ) => ({
	showSpinner: ( $isShow ) => {
		dispatch( actions.showSpinner( $isShow ) );
	},
	transactionConfirm: ( $isShow, $paymentData ) => {
		dispatch( actions.showTransactionConfirm( $isShow, $paymentData ) );
	},
	transactionComplete: ( $isShow, $paymentData ) => {
		dispatch( actions.showTransactionComplete( $isShow, $paymentData ) );
	}
});

TransactionConfirm = connect( mapStoreToProps, mapDispatchToProps )( TransactionConfirm );

export default TransactionConfirm;