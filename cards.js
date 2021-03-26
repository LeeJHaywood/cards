/*
 *	Playing card cryptographic steganography encoder/decoder.
 *
 *	Copyright (C) 2014-2018 by Lee J Haywood.
 *
 *	This program is free software: you can redistribute it and/or modify
 *	it under the terms of the GNU General Public License as published by
 *	the Free Software Foundation, either version 3 of the License, or
 *	(at your option) any later version.

 *	This program is distributed in the hope that it will be useful,
 *	but WITHOUT ANY WARRANTY; without even the implied warranty of
 *	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *	GNU General Public License for more details.
 *
 *	You should have received a copy of the GNU General Public License
 *	along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */



// The names for each card's image file, in correct order for decoder selection.
globalImageList =
	[ '1C','2C','3C','4C','5C','6C','7C','8C','9C','TC','JC','QC','KC',
	  '1D','2D','3D','4D','5D','6D','7D','8D','9D','TD','JD','QD','KD',
	  '1H','2H','3H','4H','5H','6H','7H','8H','9H','TH','JH','QH','KH',
	  '1S','2S','3S','4S','5S','6S','7S','8S','9S','TS','JS','QS','KS' ]

// English names for each card within a suit.
globalNameList =
	[ 'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
	  'Ten', 'Jack', 'Queen', 'King' ]

// English names for each suit.
globalSuitList = [ 'club', 'diamond', 'heart', 'spade' ]

// Base-62 characters.
globalBase62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

// Find the main page elements.
globalMain = getByID( 'iMain' )
globalInputField = 'iInputArea'
globalSelector = getByID( 'iSelector' )
globalCodes = getByID( 'iCodes' )
globalLink = getByID( 'iLink' )
globalOutput = getByID( 'iDecoded' )
globalNumber = getByID( 'iNumber' )
globalSwatch = getByID( 'iSwatch' )
globalIndicator = getByID( 'iIndicator' )
globalQR = getByID( 'iQR' )

// Initialise the global variables.
globalMode = ''
globalSelectedCards = []
globalLastMessage = ''
globalLastHash = ''
globalLinkCode = ''
globalLinkError = ''
globalPasswordTimer = null
globalEncodeTimer = null
globalNumImages = 0
globalNumLoaded = 0
globalStyle = 'S'
globalCoding = 'L'
globalUseLink = true
globalFromEncoder = false
globalHaveChange = false
globalFailed = false;



(
	function ()
	{
		var vRowNum, vSelectorRow, vSelectionRow, vCell, vImage, vControl

		// For each card...
		for ( var vCardNum = 0; vCardNum < 52; vCardNum++ )
		{
			// Create selector and selection rows for each suit of cards.
			vRowNum = Math.floor( vCardNum / 13 )
			if ( vCardNum % 13 == 0 )
			{
				vSelectorRow = globalSelector.insertRow( 1 + vRowNum )
				vSelectionRow = globalSelector.insertRow( 3 + ( 2 * vRowNum ) )
			}

			// Create a cell for the card that can be selected.
			vCell = document.createElement( 'td' )
			vCell.id = 'iSelect' + vCardNum
			vCell.className = 'cSelect'
			vSelectorRow.appendChild( vCell )

			// Load the reversed image first - the opposite/normal side will
			// be loaded automatically afterwards.
			vImage = document.createElement( 'img' )
			vImage.addEventListener( 'load', imageLoaded )
			vImage.addEventListener( 'error', imageFailed )
			vImage.alt = globalNameList[ vCardNum % 13 ] + ' of ' +
						 globalSuitList[ vRowNum ] + 's'
			vImage.src = 'images/back/' + globalImageList[ vCardNum ] + '.png'
			vCell.appendChild( vImage )
			if ( ! vImage.complete )
			{
				globalNumImages++
			}
			vCell.onclick = selectCard

			// Add the flip text to be displayed for a selected card.
			vControl = document.createElement( 'span' )
			vControl.appendChild( document.createTextNode( 'Flip' ) )
			vControl.appendChild( document.createElement( 'br' ) )
			vControl.appendChild( document.createTextNode( 'card' ) )
			vCell.appendChild( vControl )
			vControl.style.color = 'blue'
			vControl.style.fontSize = 'small'
			vControl.style.display = 'none'

			// Create a cell for a card that has been selected.
			vCell = document.createElement( 'td' )
			vSelectionRow.appendChild( vCell )

			// Load the 'no card' image.
			vImage = document.createElement( 'img' )
			vImage.id = 'iResult' + vCardNum
			vImage.onclick = selectCard
			vImage.addEventListener( 'load', imageLoaded )
			vImage.addEventListener( 'error', imageFailed )
			vImage.src = 'images/NC.png'
			vImage.alt = 'Selected card'
			vCell.appendChild( vImage )
			if ( ! vImage.complete )
			{
				globalNumImages++
			}
		}

		// Tell the user to wait during the image pre-load.
		getByID( 'iLoading' ).style.display = ''

		// If no images need to be loaded, force initialisation.
		if ( globalNumImages == 0 )
		{
			enableTabs()
		}
	}
)()



// Used to ensure that all images are properly pre-loaded when the page first
// opens (by counting them), and to display each image selected by the encoder
// if it was re-loaded (i.e. not cached) so that old images don't hang around.

function imageLoaded()
{
	// When displaying the encoder's output, make the card visible once loaded.
	if ( globalMode == 'Encode' )
	{
		this.parentNode.style.background = 'white'
		this.style.visibility = 'visible'
	}

	// Don't do anything if already initialised.
	if ( globalNumLoaded >= globalNumImages )
	{
		return
	}

	// Count the loaded image.
	globalNumLoaded++

	// If the the reversed card image has just been loaded, now load the normal
	// image for the same card...
	if ( this.src.match( /\/back\// ) )
	{
		this.src = this.src.replace( /\/back\//, '/' )
		if ( ! this.complete )
		{
			globalNumImages++
		}
	}
	// Otherwise, enable selection of the card within the decoder's tab.
	else
	{
		this.parentNode.onclick = selectCard
	}

	// Once all images have been pre-loaded, enable the user interface.
	if ( globalNumLoaded == globalNumImages )
	{
		enableTabs()
	}
}



// Alerts the use if an image fails to load.

function imageFailed()
{
	if ( ! globalFailed )
	{
		globalFailed = true
		alert( 'Failed to load a required image.\n\n' +
			   'Please try refreshing the page and start again.' )
	}
}



// Sets up the user interface once all images have been pre-loaded.

function enableTabs()
{
	// Hide the 'loading' message.
	getByID( 'iLoading' ).style.display = 'none'

	// Make the introduction text and tabs visible.
	for ( var vRowNum = 0; vRowNum < globalMain.rows.length - 2; vRowNum++ )
	{
		if ( vRowNum != 2 )
		{
			globalMain.rows[ vRowNum ].style.display = ''
		}
	}

	// Set up the decoder.
	redisplaySelection( true )

	// Start hashing the password.
	strengthenKey( false )
}



// Shuffles the cards in a reproducible manner based on the current password.

function strengthenKey( vCheck )
{
	// Get the password and calculate an initial hash with a fixed salt.
	var vInput = getByID( 'iPassword' ).value.replace( /  +$/, '' )
	var vBaseHash = SHA256( 'card:steganography:' + vInput )

	// Just return if a key was pressed but the password hasn't changed.
	if ( vCheck && vBaseHash == globalLastHash )
	{
		return
	}

	// Discard any existing timer, re-enabling tabs.
	if ( globalPasswordTimer )
	{
		clearTimeout( globalPasswordTimer )
		globalPasswordTimer = null
	}

	// If the password has changed...
	if ( vBaseHash != globalLastHash )
	{
		// Prepare to strengthen the initial hash.
		globalKeyHash = vBaseHash
		globalLastHash = vBaseHash

		// Indicate the password strength.
		showPasswordStrength( vInput )

		// Hide the colour swatch and display the busy indication.
		globalSwatch.style.visibility = 'hidden'
		globalIndicator.style.visibility = 'visible'

		// If the encoder/decoder are already in use...
		if ( globalMode != '' )
		{
			// Display blank cards whilst performing key stretching.
			showBlankCards()

			// Allow user to type more of the password, and give the browser
			// time to re-display the cards.
			globalPasswordTimer = setTimeout( 'strengthenKey(false)', 500 )
			return
		}
	}

	// If the password isn't blank, perform key stretching on its hash and
	// show a colour that will always be the same for a given password.
	// Note: Minimal key stretching is used, to be practical for mobile devices.
	if ( vInput != '' )
	{
		for ( var vCount = 0; vCount < 995; vCount++ )
		{
			globalKeyHash = SHA256( 'crypto:' + globalKeyHash )
		}

		globalSwatch.style.visibility = 'visible'
		globalSwatch.style.background = '#' + globalKeyHash.substr( 29, 6 )
	}

	// Hide the busy indication.
	globalIndicator.style.visibility = 'hidden'

	// If initialising, activate the encoder and show/hide introduction based
	// on cookie setting.
	if ( globalMode == '' )
	{
		useEncoder()

		var vSetting = readCookie( 'pcsi' )
		if ( vSetting == '0' || vSetting == '1' )
		{
			toggleInfo( Number( vSetting ) )
		}
	}
	// Otherwise, encode current message or decode current card selection.
	else if ( globalMode == 'Encode' )
	{
		globalLastInput = ''
		encodeMessage()
	}
	else
	{
		decodeMessage( globalCardList, '', false, false )
	}

	// Decode link if a card selection was specified in the URL.
	var vCode = location.hash.replace( /^#/, '' )
	if ( globalUseLink && vCode.match( /^[0-9A-za-z]+$/, vCode ) )
	{
		globalUseLink = false
		decodeLink( vCode, false )
	}
}



// Hides/shows the introduction when requested.

function toggleInfo( vShow )
{
	// Hide/show the introduction and hide/show the link to restore.
	globalMain.rows[ 1 ].style.display = ( vShow ? '' : 'none' )
	globalMain.rows[ 2 ].style.display = ( vShow ? 'none' : '' )

	// Store a cookie with the current setting.
	var vExpiryDate = new Date()
	vExpiryDate.setTime( vExpiryDate.getTime() + ( 1461 * 86400 * 1000 ) )
	document.cookie = 'pcsi=' + ( vShow ? '1' : '0' ) +
					  '; expires=' + vExpiryDate.toGMTString() + '; path=/'
}



// Switches the view to show the encoder.

function useEncoder()
{
	// Hide active tab, return if busy.
	if ( hideTabs() )
	{
		return
	}

	// Show the options to use both sides / all cards.
	getByID( 'iControls' ).style.display = ''
	getByID( 'iOptions' ).style.display = ''

	// Make the password input and output visible.
	getByID( 'iPassword' ).parentNode.parentNode.style.display = ''
	globalOutput.parentNode.parentNode.style.display = ''

	// Make message input visible and give it focus.  Use the message last
	// decoded to default the input.
	getByID( 'iMessage' ).style.display = ''
	setTimeout( 'getByID( globalInputField ).focus()', 250 )
	getByID( globalInputField ).value = globalLastMessage

	// Highlight the encoder's tab and set mode.
	getByID( 'iEncoder' ).className = 'cActive'
	globalMode = 'Encode'

	// Attempt to decode the current selection.
	decodeMessage( globalCardList, globalLastMessage, false, true )

	// Use the encoder to display number of bytes remaining.
	globalLastInput = ''
	encodeMessage()
}



// Switches the view to show the decoder.

function useDecoder()
{
	// Hide active tab, return if busy.
	if ( hideTabs() )
	{
		return
	}

	// Make encoder's tab inactive and display decoder's card selector.
	getByID( 'iEncoder' ).className = ''
	for ( var vRowNum = 0; vRowNum < 5; vRowNum++ )
	{
		globalSelector.rows[ vRowNum ].style.display = ''
	}

	// Make the password input visible and give it focus.
	getByID( 'iPassword' ).parentNode.parentNode.style.display = ''
	getByID( 'iPassword' ).focus()

	// Show decoded message.
	globalOutput.parentNode.parentNode.style.display = ''

	// Highlight the decoder's tab and set mode.
	getByID( 'iDecoder' ).className = 'cActive'
	globalMode = 'Decode'

	// Display cards already selected and attempt to decode them.
	redisplaySelection( false )
	decodeMessage( globalCardList, '', false, false )
}



// Displays the link and QR code tab.

function useExport()
{
	// Ensure that a link code was generated.
	if ( globalLinkCode == '' )
	{
		alert( 'Sorry, there is nothing to show in the selected tab.\n' +
			   ( globalLinkError == ''
					? 'Please ensure that a valid message has been entered'
					: globalLinkError.charAt( 0 ).toUpperCase() +
					  globalLinkError.slice( 1 ) ) + '.' )
		return
	}

	// Hide active tab, return if busy.
	if ( hideTabs() )
	{
		return
	}

	// Highlight export tab and set mode.
	getByID( 'iExport' ).className = 'cActive'
	globalMode = 'Export'

	// Hide encoder/decoder buttons.
	refreshButtons()

	// Show link code and QR code and display current link/code/image.
	globalCodes.style.display = ''
	globalQR.style.display = ''
	refreshExport( '', '' )
}



// Encodes the user's current message based on the password, displaying the
// playing cards required to represent that message.

function encodeMessage()
{
	var vNumBytes, vByteList, vIsCompressed, vIsUTF8, vUTF8, vNumber, vBadZero,
		vKeyHash, vNumCards, vBase, vQuotient, vRemainder, vIndex, vCardList,
		vDeadList, vCardNum, vResult, vLeftOver, vFlip, vNumFlips, vImage,
		vSelectID, vCount, vTemp

	// Discard any existing timer.
	if ( globalEncodeTimer )
	{
		clearTimeout( globalEncodeTimer )
		globalEncodeTimer = null
	}

	// Check if the password has changed.
	strengthenKey( true )

	// Wait if the cards are currently being shuffled using the password, or
	// if the encoder is no longer active.
	if ( globalPasswordTimer || globalMode != 'Encode' )
	{
		return
	}

	// Get the user's message, removing any trailing spaces.
	var vPlainText = getByID( globalInputField ).value.replace( / +$/, '' )

	// Check if both sides / all cards to be used.
	var vBothSides = getByID( 'iBothSides' ).checked
	var vUseAll = getByID( 'iUseAll' ).checked

	// If the input hasn't changed / is currently being changed, just schedule
	// the next check for new input and return.
	var vHash = SHA256( ( vBothSides ? 'Y' : 'N' ) +
						( vUseAll ? 'Y' : 'N' ) + vPlainText )

	if ( vHash != globalLastInput || ! globalHaveChange )
	{
		globalHaveChange = ( vHash != globalLastInput )
		globalLastInput = vHash
		globalEncodeTimer = setTimeout( encodeMessage, 250 )
		return
	}

	globalLastInput = vHash
	globalHaveChange = false

	// Repeatedly attempt to convert the message to a sequence of bytes, adding
	// trailing spaces (if required) to avoid a leading zero value...
	do
	{
		// Compress the message into a sequence of bytes.
		vByteList = pairCompress( vPlainText ).reverse()
		vIsCompressed = true

		// If using both sides (so spare bits are available)...
		vIsUTF8 = false
		if ( vBothSides )
		{
			// Convert the message from Unicode to UTF-8.
			vUTF8 = unescape( encodeURIComponent( vPlainText ) )

			// If the UTF-8 sequence is shorter, switch to using it instead.
			if ( vUTF8.length < vByteList.length )
			{
				vByteList = []
				vNumBytes = 0
				for ( vIndex = vUTF8.length - 1; vIndex >= 0; vIndex-- )
				{
					vByteList[ vNumBytes++ ] = vUTF8.charCodeAt( vIndex )
				}
				vIsCompressed = false
				vIsUTF8 = true
			}

			// If the current method is no shorter than its Unicode equivalent,
			// use the uncompressed Unicode sequence instead.
			if ( vByteList.length >= 2 * vPlainText.length )
			{
				vByteList = []
				vNumBytes = 0
				for ( vIndex = vPlainText.length - 1; vIndex >= 0; vIndex-- )
				{
					vNumber = vPlainText.charCodeAt( vIndex )
					vByteList[ vNumBytes++ ] = parseInt( vNumber / 256, 10 )
					vByteList[ vNumBytes++ ] = vNumber % 256
				}
				vIsCompressed = false
				vIsUTF8 = false
			}
		}

		// If using both sides, apply bit-level encryption to the message first.
		if ( vBothSides )
		{
			for ( vIndex = 0; vIndex < 3; vIndex++ )
			{
				vByteList = bitEncryption( SHA256( 'BitCrypt' +
												   globalKeyHash + vIndex ),
										   vByteList, false )
			}
		}

		// Check if a leading zero byte is present.  This will either be
		// because the message ends with 'su' (when using one side), which the
		// pair compressor converts to a zero value, or as a result of bit
		// encryption being used (when using both sides).
		vBadZero = ( vByteList.length > 0 && vByteList[ 0 ] == 0 )

		// If found, add a trailing space to try to escape/eliminate the zero
		// byte - or fail if too many attempts made.
		if ( vBadZero )
		{
			if ( vByteList.length > ( vBothSides ? 34 : 28 ) )
			{
				showError( 'Sorry, your message could not be encoded' )
				globalEncodeTimer = setTimeout( encodeMessage, 250 )
				return
			}

			vPlainText += ' '
		}
	}
	while ( vBadZero )

	// Fail if the message is too long.
	if ( vByteList.length > ( vBothSides ? 34 : 28 ) )
	{
		showError( 'Sorry, your message is too long' )
		globalEncodeTimer = setTimeout( encodeMessage, 250 )
		return
	}

	// Convert the sequence of bytes into a large integer, first combining
	// bytes with values derived from password hash above.
	var vValue = '0'
	for ( vIndex = 0; vIndex < vByteList.length; vIndex++ )
	{
		vValue = megaMultiply( vValue, '256' )
		vValue = megaAdd( vValue, String( vByteList[ vIndex ] ) )
	}

	// Reserve the lowest bits that will not be part of the message itself.
	vValue = megaMultiply( vValue, ( vBothSides ? '32' : '2' ) )

	// Make the number even/odd to indicate if using one side or both sides.
	if ( vBothSides )
	{
		vValue = megaAdd( vValue, '1' )
	}

	// If using both sides, use another 2 bits to indicate if either
	// pair compression or UTF-8 encoding was used.  Always indicate that
	// original bytes were encrypted with password (this wasn't done by older
	// versions of the encoder, in error).
	// Note: The second lowest bit must be used to indicate if all cards are
	//		 flipped, so cannot be used here.
	if ( vBothSides )
	{
		if ( vIsCompressed )
		{
			vValue = megaAdd( vValue, '4' )
		}

		if ( vIsUTF8 )
		{
			vValue = megaAdd( vValue, '8' )
		}

		vValue = megaAdd( vValue, '16' )
	}

	// Display the number of remaining bytes.
	var vRemaining = getByID( 'iRemaining' )
	vNumBytes = ( vBothSides ? 34 : 28 ) - vByteList.length
	destroyTree( vRemaining )
	vRemaining.appendChild( document.createTextNode( vNumBytes ) )
	vRemaining.style.color = ( vNumBytes < 0 ? 'red' : 'black' )

	// Attempt to convert to cards, but repeat if more than half are flipped
	// with the cards the other way up...
	for ( var vPassNum = 1; vPassNum <= 2; vPassNum++ )
	{
		// Start with the initial hash derived from the password.
		vKeyHash = globalKeyHash

		// Reset the decoder's list.
		vCardList = []
		vDeadList = []
		for ( vCardNum = 0; vCardNum < 52; vCardNum++ )
		{
			vDeadList[ vCardNum ] = false
			globalSelectedCards[ vCardNum ] = false
		}

		// For each card selection required...
		vLeftOver = vValue
		vResult = []
		vNumFlips = 0
		for ( vCardNum = 0;
			  vCardNum < 52 && ( vUseAll || vLeftOver != '0' ); vCardNum++ )
		{
			// Rearrange the available cards after each selection, to hide key.
			vCardList = scrambleCards( vKeyHash, vDeadList )

			// Use the card number as a number base (going down from 52),
			// calculating the number to use as a 'digit' and the left over
			// amount.  If using both sides, double the base and represent
			// flipped cards with a higher card ID (i.e. add 52).
			vNumCards = 52 - vCardNum
			vBase = ( vNumCards * ( vBothSides ? 2 : 1 ) )
			vTemp = megaDivide( vLeftOver, String( vBase ) )
			vQuotient = vTemp[ 0 ]
			vRemainder = Number( vTemp[ 1 ] )

			// Find the card ID that corresponds to the calculated 'digit',
			// flipping the card if required.
			vFlip = ( vRemainder < vNumCards ? 0 : 1 )
			if ( vPassNum == 2 )
			{
				vFlip = 1 - vFlip
			}
			vResult[ vCardNum ] = ( vCardList[ vRemainder % vNumCards ] ) +
								  ( vFlip * 52 )

			// Count the flip if not the first card.
			if ( vCardNum > 0 )
			{
				vNumFlips += vFlip
			}
			vKeyHash = SHA256( vKeyHash + vRemainder )
			vDeadList[ vResult[ vCardNum ] % 52 ] = true

			// Use the left over amount for the remaining cards, or stop if
			// no value remains.
			vLeftOver = vQuotient
		}
		globalNumSelected = vCardNum

		// Stop if not using both sides or no more than half were flipped.
		if ( ! vBothSides || ( vCardNum > 1 && vNumFlips * 2 <= vCardNum ) )
		{
			break
		}

		// Use the second lowest bit to indicate that all cards will be flipped.
		if ( vPassNum == 1 )
		{
			vValue = megaAdd( vValue, '2' )
		}
	}

	// Attempt to decode the cards, discard result if unsuccessful.
	if ( ! decodeMessage( vResult, vPlainText, false, true ) )
	{
		vResult = []
	}

	// If successful, display the result and mark the cards used as selected
	// for the decoder.  Convert encoded sequence back to a number for
	// generation of a decoder link.
	var vSelected = new Array( 52 )
	var vCode = '0'
	for ( vCardNum = 0; vCardNum < 52; vCardNum++ )
	{
		vValue = vResult[ vCardNum ]
		vImage = getByID( 'iResult' + vCardNum )
		vImage.src = ( vCardNum < vResult.length ? getImage( vValue )
												 : 'images/NC.png' )
		if ( ! vImage.complete )
		{
			vImage.parentNode.style.background = '#FFB7C5'
			vImage.style.visibility = 'hidden'
		}

		if ( vCardNum < vResult.length )
		{
			globalCardList[ vCardNum ] = vValue
			globalSelectedCards[ vValue % 52 ] = true

			if ( vCardNum < 52 - 1 )
			{
				vSelectID = 0
				for ( vCount = 0; vCount < 52; vCount++ )
				{
					if ( typeof vSelected[ vCount ] == 'undefined' )
					{
						if ( vValue % 52 == vCount )
						{
							vSelected[ vCount ] = true
							break
						}

						vSelectID++
					}
				}

				vCode = megaMultiply( vCode,
									  String( ( 52 - vCardNum ) *
											  ( vBothSides ? 2 : 1 ) ) )
				vCode = megaAdd( vCode, String( vSelectID *
												( vBothSides ? 2 : 1 ) ) )
				if ( vValue >= 52 )
				{
					vCode = megaAdd( vCode, '1' )
				}
			}
		}
	}

	// Update code with number of cards and indicate if both sides used and
	// show decoder link.
	if ( vResult.length > 0 )
	{
		vCode = megaMultiply( vCode, String( 52 * 2 ) )
		vCode = megaAdd( vCode,
						 String( ( ( vResult.length - 1 ) * 2 ) +
								 ( vBothSides ? 1 : 0 ) ) )
		encodeLink( vCode )
	}

	// Mark any non-blank message as being from the encoder.
	globalFromEncoder = ( vPlainText != '' )

	// Discard any cards previously undone and update visibility of buttons.
	globalSelectionEnd = globalNumSelected
	refreshButtons()

	// Schedule the next check for new input.
	globalEncodeTimer = setTimeout( encodeMessage, 250 )
}



// Attempts to decode the current set of cards, either to test the selection
// made by the encoder or using the cards chosen in the decoder's tab.

function decodeMessage( vResult, vPlainText, vBothSides, vChecking )
{
	var vCardList, vValue, vBase, vUncompressed, vUTF8

	// Check if the password has changed.
	strengthenKey( true )

	// Wait if the cards are currently being shuffled using the password.
	if ( globalPasswordTimer )
	{
		return false
	}

	// Start with the initial hash derived from the password.
	var vKeyHash = globalKeyHash

	// Set up the list of available cards.
	var vDeadList = []
	for ( var vCardNum = 0; vCardNum < 52; vCardNum++ )
	{
		vDeadList[ vCardNum ] = false
	}

	// Use the first card to determine if both sides were chosen (lowest bit)
	// and, if so, if all cards were flipped.  Then use each card to
	// reconstruct the sequence of 'digits'.
	var vDigits = new Array( 52 )
	var vFlipAll = false
	for ( vCardNum = 0;
		  vCardNum < 52 && vCardNum < globalNumSelected; vCardNum++ )
	{
		// Rearrange the cards into their scrambled order.
		vCardList = scrambleCards( vKeyHash, vDeadList )
		vValue = vCardList.indexOf( vResult[ vCardNum ] % 52 )
		if ( vCardNum == 0 )
		{
			if ( vValue % 2 )
			{
				vBothSides = true
				if ( vValue & 2 )
				{
					vFlipAll = true
				}
			}
		}

		vValue = vValue +
				 ( ( ! vFlipAll && vResult[ vCardNum ] < 52 ) ||
				   ( vFlipAll && vResult[ vCardNum ] >= 52 ) ?
												0 : 52 - vCardNum )
		vDigits[ vCardNum ] = String( vValue )
		vKeyHash = SHA256( vKeyHash + vValue )
		vDeadList[ vResult[ vCardNum ] % 52 ] = true
	}

	// Re-construct original number, starting with the most significant digit.
	var vDecoded = '0'
	for ( vCardNum = 0;
		  vCardNum < 52 && vCardNum < globalNumSelected; vCardNum++ )
	{
		vBase = ( ( 53 - globalNumSelected ) + vCardNum ) *
				( vBothSides ? 2 : 1 )
		vDecoded = megaMultiply( vDecoded, String( vBase ) )
		vDecoded = megaAdd( vDecoded,
							vDigits[ ( globalNumSelected - 1 ) - vCardNum ] )
	}

	// Display the numeric value.
	destroyTree( globalNumber )
	globalNumber.appendChild( document.createTextNode( vDecoded ) )

	// Discard the bit that indicates if both sides were used.  If both sides
	// were used, separate out the other bits that are not part of the message.
	var vTemp = megaDivide( vDecoded, ( vBothSides ? '32' : '2' ) )
	vDecoded = vTemp[ 0 ]

	// Check if either compression or UTF-8 encoding was used.
	var vIsCompressed = ( ! vBothSides || ( vTemp[ 1 ] & 4 ) == 4 )
	var vIsUTF8 = ( vBothSides && ( vTemp[ 1 ] & 8 ) == 8 )

	// Check if sequence is from original encoder, which didn't scramble the
	// original text before flipping cards (in error) or the current encoder.
	var vIsNew = ( vBothSides && ( vTemp[ 1 ] & 16 ) == 16 )

	// Convert the number into the original text (which may still be compressed
	// or encoded as UTF-8).
	var vBytes = getByID( 'iBytes' )
	destroyTree( vBytes )
	vValue = vDecoded
	var vIndex = 0
	var vList = []
	while ( vValue != '0' )
	{
		vTemp = megaDivide( vValue, '256' )
		vValue = vTemp[ 0 ]

		if ( vIndex > 0 && vIndex % 17 == 0 )
		{
			vBytes.appendChild( document.createElement( 'br' ) )
		}

		vList[ vIndex ] = Number( vTemp[ 1 ] )
		vBytes.appendChild(
				document.createTextNode( ( vIndex > 0 &&
										   vIndex % 17 > 0 ? '\xA0' : '' ) +
										 vList[ vIndex++ ] ) )
	}

	// If later both sides were used with later version of encoder, decrypt
	// bits using password hash.
	if ( vIsNew )
	{
		vList = vList.reverse()
		for ( vIndex = 3 - 1; vIndex >= 0; vIndex-- )
		{
			vList =
				bitEncryption( SHA256( 'BitCrypt' + globalKeyHash + vIndex ),
							   vList, true )
		}
		vList = vList.reverse()
	}

	try
	{
		// If encoder used compression, attempt to recover the original text...
		if ( vIsCompressed )
		{
			vUncompressed = pairUncompress( vList )
		}
		// Otherwise, if UTF-8 was used attempt to convert back to Unicode...
		else if ( vIsUTF8 )
		{
			vUTF8 = ''
			for ( vIndex = 0; vIndex < vList.length; vIndex++ )
			{
				vUTF8 += String.fromCharCode( vList[ vIndex ] )
			}
			var vUncompressed = decodeURIComponent( escape( vUTF8 ) )
		}
		// Otherwise, convert directly back to Unicode.
		else
		{
			if ( vList.length % 2 )
			{
				vList.push( 0 )
			}

			vUncompressed = ''
			for ( vIndex = 0; vIndex < vList.length; vIndex += 2 )
			{
				vUncompressed +=
						String.fromCharCode( ( vList[ vIndex + 1 ] * 256 ) +
											 vList[ vIndex ] )
			}
		}
	}
	catch ( vError )
	{
		showError( 'Sorry, your message could not be decoded (' + vError + ')' )
		return false
	}

	// For the encoder, display an error if the decoded text doesn't match
	// what was typed.
	if ( vChecking && vUncompressed != vPlainText )
	{
		showError( 'Sorry, your message is too long or contains' +
				   ' invalid characters' )
		return false
	}

	// Remove trailing spaces that may have been added by the encoder, to
	// eliminate a leading zero byte.
	// Note: The original encoder allowed trailing spaces as part of the input,
	//		 preserved after decoding, but this is no longer supported.
	vUncompressed = vUncompressed.replace( / +$/, '' )

	// Display the original text if it can be decompressed, or a success
	// message for the encoder if the input is being hidden.
	destroyTree( globalOutput )
	globalOutput.style.fontWeight = 'normal'
	if ( globalMode == 'Encode' && getByID( 'iHide' ).checked )
	{
		globalOutput.appendChild( document.createTextNode( '(Matches input)' ) )
		globalOutput.style.color = 'green'
	}
	else
	{
		var vLines = vUncompressed.split( "\n" )
		for ( var vLineNum = 0; vLineNum < vLines.length; vLineNum++ )
		{
			if ( vLineNum > 0 )
			{
				globalOutput.appendChild( document.createElement( 'br' ) )
			}
			globalOutput.appendChild(
							document.createTextNode( vLines[ vLineNum ] ) )
		}
		globalOutput.style.color = 'black'
	}

	globalLastMessage = vUncompressed

	// Display the compressed size in bytes and number of Unicode characters.
	vBytes.appendChild( document.createTextNode(
							' (' + vIndex + '/' + vUncompressed.length + ')' ) )

	// Return successfully.
	return true
}



// Encodes message's link code into base 62 and displays as decoder link.

function encodeLink( vValue )
{
	var vQuotient, vTemp

	var vCode = ''
	while ( vValue != '0' )
	{
		vTemp = megaDivide( vValue, '62' )
		vValue = vTemp[ 0 ]
		vCode += globalBase62.charAt( vTemp[ 1 ] )
	}

	if ( vCode != '' )
	{
		if ( decodeLink( vCode, true ) )
		{
			globalLinkCode = vCode
			globalLinkError = ''
		}
		else
		{
			globalLinkCode = ''
			globalLink.appendChild(
				document.createTextNode(
					'Sorry, failed to generate link for this message' ) )
		}
	}
}



// Uses a base 62 link code to re-create the sequence of cards from the encoder.

function decodeLink( vCode, vChecking )
{
	var vSelectID, vCount, vTemp

	// Convert back from base 62.
	var vValue = '0'
	for ( var vIndex = vCode.length - 1; vIndex >=0; vIndex-- )
	{
		vValue = megaMultiply( vValue, '62' )
		vValue = megaAdd( vValue,
						  String( globalBase62.indexOf(
												vCode.charAt( vIndex ) ) ) )
	}

	// Get number of cards, check if both sides used.
	vTemp = megaDivide( vValue, String( 52 * 2 ) )
	vValue = vTemp[ 0 ]
	var vTotalCards = parseInt( vTemp[ 1 ] / 2, 10 ) + 1
	var vNumCards = ( vTotalCards < 52 ? vTotalCards : 52 - 1 )
	var vBothSides = ( vTemp[ 1 ] % 2 == 1 )

	// For each encoded selection...
	var vResult = []
	var vBase = ( 52 - vNumCards )
	while ( vResult.length < vNumCards )
	{
		// Get card number/flip bit.
		vTemp = megaDivide( vValue,
							String( ( vBase + 1 ) * ( vBothSides ? 2 : 1 ) ) )
		vValue = vTemp[ 0 ]
		vIndex = vTemp[ 1 ]
		if ( vBothSides )
		{
			vIndex = parseInt( vIndex / 2, 10 ) + ( vIndex % 2 ? 52 : 0 )
		}

		vResult[ vResult.length ] = vIndex
		vBase++
	}

	if ( vValue != '0' )
	{
		globalLinkError = 'the sequence of cards could not be decoded (' +
						  vResult.length + '/' + vNumCards + ')'
		if ( ! vChecking )
		{
			alert( 'Sorry, ' + globalLinkError )
			globalLinkCode = ''
		}

		return false
	}

	var vSelected = new Array( 52 )
	for ( var vCardNum = 0; vCardNum < vTotalCards; vCardNum++ )
	{
		vIndex = ( vCardNum < 52 - 1 ? vResult[ ( vNumCards - 1 ) - vCardNum ]
									 : 0 )

		// Find the card out of those remaining, mark as selected.
		vSelectID = 0
		for ( vCount = 0; vCount < 52; vCount++ )
		{
			if ( typeof vSelected[ vCount ] == 'undefined' )
			{
				if ( vIndex % 52 == vSelectID++ )
				{
					vIndex = vCount + ( vIndex < 52 ? 0 : 52 )
					if ( vChecking )
					{
						if ( globalCardList[ vCardNum ] != vIndex )
						{
							globalLinkError = 'the decoded card selection' +
											  ' does not match (' + vCardNum +
											  ': ' + vIndex + '/' +
											  globalCardList[ vCardNum ] + ')'
							return false
						}
					}
					else
					{
						globalCardList[ vCardNum ] = vIndex
						globalSelectedCards[ vCount ] = true
					}

					vSelected[ vCount ] = true
					break
				}
			}
		}

		if ( vCount >= 52 )
		{
			globalLinkError = 'the sequence of cards could not be decoded (' +
							  vCardNum + ')'
			alert( 'Sorry, ' + globalLinkError )
			globalLinkCode = ''
		}
	}

	// Display the selected cards in the decoder.
	if ( ! vChecking )
	{
		globalMode = 'Decode'
		globalNumSelected = vTotalCards
		getByID( 'iBothSides' ).checked = vBothSides
		getByID( 'iUseAll' ).checked = ( vTotalCards == 52 )
		useDecoder()
		redisplaySelection( false )

		globalLinkCode = vCode
	}

	// Indicate success.
	return true
}



// Hides all tabbed elements or returns true if busy.

function hideTabs()
{
	// Fail if currently performing key stretching.
	if ( globalPasswordTimer )
	{
		return true
	}

	// Stop monitoring for encoder input.
	if ( globalEncodeTimer )
	{
		clearTimeout( globalEncodeTimer )
		globalEncodeTimer = null
	}

	// Make all tabs appear inactive
	getByID( 'iEncoder' ).className = ''
	getByID( 'iDecoder' ).className = ''
	getByID( 'iExport' ).className = ''

	// Hide decoder's card selector.
	for ( var vRowNum = 0; vRowNum < 5; vRowNum++ )
	{
		globalSelector.rows[ vRowNum ].style.display = 'none'
	}

	// Hide password/message inputs and decoded message.
	getByID( 'iPassword' ).parentNode.parentNode.style.display = 'none'
	getByID( 'iMessage' ).style.display = 'none'
	globalOutput.parentNode.parentNode.style.display = 'none'

	// Hide encoder options to use both sides / all cards.
	getByID( 'iOptions' ).style.display = 'none'

	// Hide link / QR code.
	globalQR.style.display = 'none'
	globalCodes.style.display = 'none'

	// Return successfully.
	return false
}



// Encrypts/decrypts bytes based on current hash, derived from the password.

function bitEncryption( vKeyHash, vByteList, vDecode )
{
	var vHash, vBits, vCount, vIndex, vValue

	// Convert byte list into stream of bits.
	var vScrambledList = []
	var vBitList = []
	var vBitNum = 0
	for ( var vByteNum = 0; vByteNum < vByteList.length; vByteNum++ )
	{
		vBits = vByteList[ vByteNum ].toString( 2 )
		vBits = ( '0000000' + vBits ).slice( -8 )
		for ( vCount = 0; vCount < 8; vCount++ )
		{
			vHash = SHA256( vKeyHash + '' + vBitNum )
			if ( vDecode )
			{
				vScrambledList[ vBitNum ] = { key: vHash, num: vBitNum }
				vBitList[ vBitNum++ ] = parseInt( vBits.charAt( vCount ), 2 )
			}
			else
			{
				vScrambledList[ vBitNum++ ] =
					{ key: vHash,
					  bit: parseInt( vBits.charAt( vCount ), 2 ) ^
									( parseInt( vHash.substr( -1 ), 16 ) & 1 ) }
			}
		}
	}

	// Sort the bits into order indicated by the hashes.
	vScrambledList.sort( compareHashes )

	// Convert back to bytes.
	var vNumBits = vBitNum
	vBitNum = 0
	for ( var vByteNum = 0; vByteNum < vByteList.length; vByteNum++ )
	{
		vValue = 0
		for ( vCount = 0; vCount < 8; vCount++ )
		{
			if ( vDecode )
			{
				for ( vIndex = 0; vIndex < vNumBits; vIndex++ )
				{
					if ( vScrambledList[ vIndex ].num == vBitNum )
					{
						vHash = vScrambledList[ vIndex ].key
						vValue = ( vValue << 1 ) +
								 ( vBitList[ vIndex ] ^
									( parseInt( vHash.substr( -1 ), 16 ) & 1 ) )
						break
					}
				}

				if ( vIndex >= vNumBits )
				{
					alert( 'Internal error - failed to decrypt bits.' )
					throw 'Card decryption failed.'
				}

				vBitNum++
			}
			else
			{
				vValue = ( vValue << 1 ) + vScrambledList[ vBitNum++ ].bit
			}
		}

		vByteList[ vByteNum ] = vValue
	}

	return vByteList
}



// Rearranges the cards based on the current hash, derived from the password
// and any numbers already processed.

function scrambleCards( vKeyHash, vDeadList )
{
	// Use hash of the current hash and each unused card number as sort keys.
	var vScrambledList = []
	var vNumCards = 0
	for ( var vCardNum = 0; vCardNum < 52; vCardNum++ )
	{
		if ( ! vDeadList[ vCardNum ] )
		{
			vScrambledList[ vNumCards++ ] =
				{ key: SHA256( vKeyHash + '' + vCardNum ), card: vCardNum }
		}
	}

	// Sort the cards into the required order.
	vScrambledList.sort( compareHashes )

	// Return the new list of face values.
	var vCardList = []
	for ( var vCardNum = 0; vCardNum < vNumCards; vCardNum++ )
	{
		vCardList[ vCardNum ] = vScrambledList[ vCardNum ].card
	}
	return vCardList
}



// Used to sort entries into the order corresponding to the password.

function compareHashes( vFirst, vSecond )
{
	if ( vFirst.key == vSecond.key )
	{
		return 0
	}
	return ( vFirst.key > vSecond.key ? 1 : -1 )
}



// Reveals the numeric encodings under the cards.

function showNumerics()
{
	getByID( 'iReveal' ).style.display = 'none'
	getByID( 'iNumber' ).parentNode.style.display = ''
	getByID( 'iBytes' ).parentNode.style.display = ''

	alert( 'Please remember to avoid sharing the numeric values as they' +
		   ' reveal the original message, before the password is applied!' )
}



// Displays an error message.

function showError( vError )
{
	// Display error text.
	destroyTree( globalOutput )
	globalOutput.appendChild( document.createTextNode( vError ) )
	globalOutput.style.fontWeight = 'bold'
	globalOutput.style.color = '#DE3163'

	// Discard link code.
	globalLinkCode = ''
}



// Displays the 'no card' image in all places whilst the encoder is busy.

function showBlankCards()
{
	if ( globalMode == 'Encode' )
	{
		for ( var vCardNum = 0; vCardNum < 52; vCardNum++ )
		{
			getByID( 'iResult' + vCardNum ).src = 'images/NC.png'
		}
	}
}



// Re-displays the cards available for selection, optionally marking all the
// places in the deck as empty.

function redisplaySelection( vReset )
{
	var vCardNum, vCell, vImage, vText

	// If initialising/resetting...
	if ( vReset )
	{
		// Discard the card list and forget any message last decoded.
		globalCardList = []
		globalNumSelected = 0
		globalSelectionEnd = 0
		globalLastMessage = ''
		globalFromEncoder = false

		// Mark all cards as not selected.
		for ( vCardNum = 0; vCardNum < 52; vCardNum++ )
		{
			globalSelectedCards[ vCardNum ] = false
		}

		// For the encoder, discard any user input.
		if ( globalMode == 'Encode' )
		{
			getByID( globalInputField ).value = ''
			destroyTree( globalNumber )
		}

		// Discard any decoder output.
		destroyTree( globalOutput )
	}

	// For each card...
	for ( vCardNum = 0; vCardNum < 52; vCardNum++ )
	{
		// For the decoder, show or hide the card depending on its selection.
		if ( globalMode == 'Decode' )
		{
			vCell = getByID( 'iSelect' + vCardNum )
			vImage = vCell.firstChild
			vText = vImage.nextSibling
			if ( globalSelectedCards[ vCardNum ] )
			{
				vImage.style.display = 'none'
				vText.style.display = ''
			}
			else
			{
				vText.style.display = 'none'
				vImage.style.display = ''
				vImage.src = getImage( vCardNum )
			}
		}

		// Display each card that has been selected (either as the encoder's
		// output or using the decoder's user interface), flipping as required.
		getByID( 'iResult' + vCardNum ).src =
					( vCardNum < globalNumSelected
									? getImage( globalCardList[ vCardNum ] )
									: 'images/NC.png' )
	}

	// Update visibility of buttons.
	refreshButtons()
}



// Returns the image URL for a card with the specified ID, selecting the image
// for the flipped card when required.

function getImage( vCardID )
{
	return 'images/' + ( vCardID < 52 ? '' : 'back/' ) +
		   globalImageList[ vCardID % 52 ] + '.png'
}



// Makes the encoder's message input visible/hidden based on checkbox's state.

function toggleInput()
{
	// Find the fields to be switched from/to.
	var vHide = getByID( 'iHide' ).checked 
	var vOldElement = getByID( globalInputField )
	var vNewInput = ( vHide ? 'iInputLine' : 'iInputArea' )
	var vNewElement = getByID( vNewInput )

	// If hiding an input containing line breaks, ask the user to confirm the
	// conversion to one line of text.  If cancelled, restore the checkbox.
	var vValue = vOldElement.value
	if ( vHide && vValue.match( /\n/ ) &&
		 ! confirm( 'Your message will need to be converted to a single line' +
					' in order to hide it.\nDo you want to continue?' ) )
	{
		return false
	}

	// Hide the old field and display the new one, transferring the value and
	// removing line breaks if required.
	vNewElement.style.display = ''
	vNewElement.value = ( vHide ? vValue.replace( / *\n */g, ' ' ) : vValue )
	vOldElement.style.display = 'none'
	globalInputField = vNewInput

	// Hide/re-display the numeric value / bytes.
	globalNumber.parentNode.style.display = ( vHide ? 'none' : '' )
	getByID( 'iBytes' ).parentNode.style.display = ( vHide ? 'none' : '' )

	// Refresh the encoder and return successfully.
	globalLastInput = ''
	encodeMessage()
	return true
}



// Performs an action for a card in the decoder's selection panel.  If the card
// hasn't been selected already, it is moved to the selection.  Otherwise, the
// card previously selected is flipped.

function selectCard()
{
	var vValue

	// If the message was entered into the encoder, confirm its corruption.
	// Just return if the encoder is in use or no ID given.
	if ( globalMode == 'Encode' || this.id == '' || ! confirmEdit() )
	{
		return
	}

	// Get the selected card number.
	var vCardNum = this.id.substr( 7 )

	// If a selected card has been clicked then just flip it (or just return
	// if placeholder clicked)...
	if ( this.id.substr( 0, 7 ) == 'iResult' )
	{
		if ( vCardNum >= globalNumSelected )
		{
			return
		}

		vValue = globalCardList[ vCardNum ]
		globalCardList[ vCardNum ] = ( vValue < 52 ? 52 : 0 ) + ( vValue % 52 )

		getByID( 'iResult' + vCardNum ).src =
								getImage( globalCardList[ vCardNum ] )
	}
	// Otherwise, if the card has already been selected...
	else if ( globalSelectedCards[ vCardNum ] )
	{
		for ( var vIndex = 0;
			  vIndex < 52 && vIndex < globalNumSelected; vIndex++ )
		{
			vValue = globalCardList[ vIndex ]
			if ( vValue % 52 == vCardNum )
			{
				globalCardList[ vIndex ] = ( vValue < 52 ? 52 : 0 ) +
										   ( vValue % 52 )

				getByID( 'iResult' + vIndex ).src =
										getImage( globalCardList[ vIndex ] )
				break
			}
		}
	}
	// Otherwise...
	else
	{
		// Add the card to the sequence and mark it as selected.
		globalCardList[ globalNumSelected ] = vCardNum
		globalSelectedCards[ vCardNum ] = true

		// Replace the card from those to be selected with an empty space, and
		// re-display it in the selected sequence.
		getByID( 'iSelect' + vCardNum ).firstChild.style.display = 'none'
		getByID( 'iResult' + globalNumSelected ).src = getImage( vCardNum )

		// Display the 'flip card' text.
		this.firstChild.nextSibling.style.display = ''

		// Allow the selection to be undone and discard any cards previously
		// undone.
		globalNumSelected++
		globalSelectionEnd = globalNumSelected

		// Update visibility of buttons.
		refreshButtons()
	}

	// Attempt to decode the new selection.
	decodeMessage( globalCardList, '', false, false )
}



// Performs an 'undo' by removing the card at the end of the selection.

function removeCard()
{
	// If there are cards remaining and the message can be edited...
	if ( globalNumSelected > 0 && confirmEdit() )
	{
		// Remove the last card from the sequence of selections, and mark
		// it as no longer selected.
		var vCardNum = globalCardList[ --globalNumSelected ]
		globalSelectedCards[ vCardNum % 52 ] = false

		// Re-display the cards.
		redisplaySelection( false )

		// Attempt to decode the remaining cards.
		decodeMessage( globalCardList, '', false, false )
	}

	// Update visibility of buttons.
	refreshButtons()
}



// Performs an 'redo' by restoring the last card affected by the 'undo' button.

function restoreCard()
{
	// If cards are available to be restored...
	if ( globalNumSelected < globalSelectionEnd )
	{
		// Restore the last card that was removed by the 'undo' button.
		var vCardNum = globalCardList[ globalNumSelected++ ]
		globalSelectedCards[ vCardNum % 52 ] = true

		// Re-display the cards and make the 'undo' button visible.
		redisplaySelection( false )

		// Attempt to decode the restored list of cards.
		decodeMessage( globalCardList, '', false, false )
	}

	// Update visibility of buttons.
	refreshButtons()
}



// Reverses the selection of cards to cope with them being read backwards.

function reverseCards()
{
	// If the message was entered into the encoder, confirm its corruption.
	if ( ! confirmEdit() )
	{
		return
	}

	// Re-build the selection without any hidden by the 'undo' button, in
	// reverse order.
	var vNewList = []
	for ( var vCardNum = 0; vCardNum < globalNumSelected; vCardNum++ )
	{
		vNewList[ globalNumSelected - ( vCardNum + 1 ) ] =
											globalCardList[ vCardNum ]
	}
	globalCardList = vNewList
	globalSelectionEnd = globalNumSelected

	// Re-display the cards.
	redisplaySelection( false )

	// Attempt to decode the reversed list of cards.
	decodeMessage( globalCardList, '', false, false )

	// For the encoder, update the input.
	if ( globalMode == 'Encode' )
	{
		getByID( globalInputField ).value = globalLastMessage
		destroyTree( globalNumber )
	}
}



// Flips all selected cards (including those hidden by the 'undo' button) to
// cope with them being read the wrong way up.

function flipCards()
{
	var vValue

	// If the message can be edited...
	if ( confirmEdit() )
	{
		// Flip each card in the selection list.
		for ( var vCardNum = 0; vCardNum < globalSelectionEnd; vCardNum++ )
		{
			vValue = globalCardList[ vCardNum ]
			globalCardList[ vCardNum ] = ( vValue % 52 ) +
										 ( vValue < 52 ? 52 : 0 )
		}

		// Re-display the selection.
		redisplaySelection( false )

		// Attempt to decode the flipped list of cards.
		decodeMessage( globalCardList, '', false, false )
	}
}



// Warns the user if they attempt to use the decoder tab to corrupt a sequence
// of cards originally set using the decoder.

function confirmEdit()
{
	// If the message is from the encoder, return indicating if the user has
	// confirmed its corruption.  If so, don't warn again.
	if ( globalFromEncoder )
	{
		if ( confirm( 'Are you sure that you want to corrupt this message?' ) )
		{
			globalFromEncoder = false
			return true
		}
		return false
	}

	// Otherwise, return indicating that the cards may be changed.
	return true
}



// Displays link code and associated QR code, updating style/link type if given.

function refreshExport( vNewStyle, vNewCoding )
{
	// Remove existing link / QR code.
	destroyTree( globalLink )
	destroyTree( globalQR )

	// Update style/coding if changed.
	if ( vNewStyle != '' )
	{
		if ( vNewStyle == 'R' &&
			 ! confirm( 'Are you sure that you want to use the server to' +
						' generate rounded QR codes?\n\nYou should ensure' +
						' that a password is set before doing this.' ) )
		{
			vNewStyle = 'S'
			getByID( 'iSquare' ).checked = true
		}

		globalStyle = vNewStyle
	}

	if ( vNewCoding != '' )
	{
		globalCoding = vNewCoding
	}

	// Use code if link not required...
	var vValue = globalLinkCode
	if ( globalCoding == 'C' )
	{
		globalLink.appendChild( document.createTextNode( vValue ) )
	}
	// Otherwise...
	else
	{
		// Generate link based on selection.
		if ( globalCoding == 'V' )
		{
			vValue = 'http://qurl.org/qmV' + '#' + encodeURIComponent( vValue )
		}
		else if ( globalCoding == 'S' )
		{
			vValue = 'http://leehaywood.org/cards/' + '#' +
					 encodeURIComponent( vValue )
		}
		else
		{
			vValue = 'https://secure.leehaywood.org/cards/' + '#' +
					 encodeURIComponent( vValue )
		}

		// Display link.
		var vLink = document.createElement( 'a' )
		vLink.href = vValue
		vLink.target = '_blank'
		vLink.appendChild( document.createTextNode( vValue ) )
		globalLink.appendChild( vLink )
	}

	// Get rounded QR code from server if required...
	var vImage = document.createElement( 'img' )
	if ( globalStyle == 'R' )
	{
		vImage.src = 'https://secure.leehaywood.org/QR/?text=' +
					 encodeURIComponent( vValue ) + '&size=250'
		vImage.alt = 'Export/import link'
		vImage.title = vValue
		globalQR.appendChild( vImage )
	}
	// Otherwise, generate standard QR code within browser.
	else
	{
		new QRCode( globalQR, { width: 250, height: 250, text: vValue } )
	}
}



// Displays/hides buttons based on current state.

function refreshButtons()
{
	var vID

	// Determine which buttons should be visible/hidden.
	var vStates = [ 'iUndo', ( globalNumSelected > 0 ),
					'iRedo', ( globalNumSelected < globalSelectionEnd ),
					'iClear', ( globalMode != 'Export' &&
								globalNumSelected > 0 ),
					'iReverse', ( globalMode == 'Decode' &&
								  globalNumSelected > 1 ),
					'iFlipAll', ( globalMode == 'Decode' &&
								  globalNumSelected > 0 ) ]

	// Change the visibility of each active button.
	for ( var vIndex = 0; vIndex < vStates.length; vIndex += 2 )
	{
		vID = vStates[ vIndex ]

		if ( globalMode == 'Decode' || ( vID != 'iUndo' && vID != 'iRedo' ) )
		{
			getByID( vID ).style.visibility =
							( vStates[ vIndex + 1 ] ? 'visible' : 'hidden' )
		}
	}
}



// Re-displays the password strength indication.
// Note: This is partly based on passwordmeter.com scoring.

function showPasswordStrength( vInput )
{
	var vNumUnique, vSequence, vMinVal, vComplexity,
		vChar, vIndex2, vHaveDuplicate

	// For each character...
	var vLength = vInput.length
	var vLastType = ''
	var vNumUC = 0
	var vNumDupUC = 0
	var vNumLC = 0
	var vNumDupLC = 0
	var vNumDigits = 0
	var vDupDigits = 0
	var vNumSymbols = 0
	var vNumMiddle = 0
	var vAdjustment = 0
	var vNumReused = 0
	for ( var vIndex = 0; vIndex < vLength; vIndex++ )
	{
		vChar = vInput.charAt( vIndex )

		// Count if an upper case character, and count repeats...
		if ( vChar.match( /[A-Z]/ ) )
		{
			vNumUC++

			if ( vLastType == 'UC' )
			{
				vNumDupUC++
			}
			vLastType = 'UC'
		}
		// Otherwise, count if a lower case letter, and count repeats...
		else if ( vChar.match( /[a-z]/ ) )
		{
			vNumLC++

			if ( vLastType == 'LC' )
			{
				vNumDupLC++
			}
			vLastType = 'LC'
		}
		// Otherwise, count if a digit, and count those not at the beginning /
		// end as well as repeats...
		else if ( vChar.match( /[0-9]/ ) )
		{
			vNumDigits++

			if ( vIndex > 0 && vIndex < vLength - 1 )
			{
				vNumMiddle++
			}

			if ( vLastType == 'Digit' )
			{
				vDupDigits++
			}
			vLastType = 'Digit'
		}
		// Otherwise, count as a symbol and count those not at the beginning /
		// end.
		else
		{
			vNumSymbols++

			if ( vIndex > 0 && vIndex < vLength - 1 )
			{
				vNumMiddle++
			}
		}

		// Check if the character appears elsewhere and, if so, calculate an
		// adjustment based on the distance between the occurrences.
		vHaveDuplicate = false
		for ( vIndex2 = 0; vIndex2 < vLength; vIndex2++ )
		{
			if ( vIndex != vIndex2 && vChar == vInput[ vIndex2 ] )
			{
				vAdjustment += Math.abs( vLength / ( vIndex2 - vIndex ) )
				vHaveDuplicate = true
			}
		}

		// Count each reused character, and re-calculate the adjustment based
		// on the number of unique characters.
		if ( vHaveDuplicate )
		{
			vNumReused++
			vNumUnique = vLength - vNumReused
			vAdjustment = ( vNumUnique > 0
								? Math.ceil( vAdjustment / vNumUnique )
								: Math.ceil( vAdjustment ) )
		}
	}



	// Base the initial score on the password length, deducting points for any
	// consecutive letters and/or digits.  Give a bonus for any digits/symbols
	// not at the beginning/end.
	var vScore = ( ( vLength * 4 ) + ( vNumMiddle * 2 ) ) -
				 ( ( vNumDupUC + vNumDupLC + vDupDigits ) * 2 )

	// Deduct points if only letters or only digits present.
	if ( ( ( vNumLC > 0 || vNumUC > 0 ) &&
		   vNumSymbols === 0 && vNumDigits === 0 ) ||
		 ( vNumLC === 0 && vNumUC === 0 && vNumSymbols === 0 &&
		   vNumDigits > 0 ) )
	{
		vScore -= vLength
	}

	// Deduct points for reused characters.
	if ( vNumReused > 0 )
	{
		vScore -= parseInt( vAdjustment, 10 )
	}

	// Determine if basic requirements have been met.
	var vCount = 0
	var vList = [ vLength, vNumUC, vNumLC, vNumDigits, vNumSymbols ]
	for ( vIndex = 0; vIndex < vList.length; vIndex++ )
	{
		vMinVal = ( vIndex == 0 ? 8 - 1 :  0 )
		if ( vList[ vIndex ] >= vMinVal + 1 )
		{
			vCount++
		}
	}

	// Increase the score for each minimum requirement met (if enough met).
	if ( vCount > ( vInput.length >= 8 ? 3 : 4 ) )
	{
		vScore += ( vCount * 2 )
	}

	// Add points based on the number of upper/lower case letters, digits and
	// symbols present.
	if ( vNumUC > 0 && vNumUC < vLength )
	{
		vScore += ( ( vLength - vNumUC ) * 2 )
	}
	if ( vNumLC > 0 && vNumLC < vLength )
	{
		vScore += ( ( vLength - vNumLC ) * 2 )
	}
	if ( vNumDigits > 0 && vNumDigits < vLength )
	{
		vScore += ( vNumDigits * 4 )
	}
	if ( vNumSymbols > 0 )
	{
		vScore += ( vNumSymbols * 6 )
	}

	// Reverse the password.
	// Note: This assumes that any Unicode characters are the BMP.
	var vReverse = vInput.split( '' ).reverse().join( '' )

	// Deduct points for sequential letters (forwards and backwards).
	var vLetters = 'abcdefghijklmnopqrstuvwxyz'
	for ( vIndex = 0; vIndex < vLetters.length - 3; vIndex++ )
	{
		vSequence = vLetters.substring( vIndex, vIndex + 3 )
		if ( vInput.toLowerCase().indexOf( vSequence ) >= 0 ||
			 vReverse.toLowerCase().indexOf( vSequence ) >= 0 )
		{
			vScore -= 3
		}
	}

	// Deduct points for sequential digits (forwards and backwards).
	var vDigits = '01234567890'
	for ( vIndex = 0; vIndex < vDigits.length - 3; vIndex++ )
	{
		vSequence = vDigits.substring( vIndex, vIndex + 3 )
		if ( vInput.indexOf( vSequence ) >= 0 ||
			 vReverse.indexOf( vSequence ) >= 0 )
		{
			vScore -= 3
		}
	}



	// Determine complexity based on overall score.
	var vColour = 'red'
	vScore = Math.min( Math.max( vScore, 0 ), 100 )
	if ( vLength == 0 )
	{
		vComplexity = 'Insecure'
	}
	else if ( vScore >= 0 && vScore < 20 )
	{
		vComplexity = 'Very weak'
	}
	else if ( vScore < 40 )
	{
		vComplexity = 'Weak'
	}
	else if ( vScore < 60 )
	{
		vComplexity = 'Good'
		vColour = 'green'
	}
	else if ( vScore < 80 )
	{
		vComplexity = 'Strong'
		vColour = 'green'
	}
	else
	{
		vComplexity = 'Very strong'
		vColour = 'green'
	}

	// Display the score.
	var vBar = getByID( 'iBar' )
	vBar.style.backgroundPosition = '-' + ( vScore * 4 ) + 'px'
	vBar.removeChild( vBar.firstChild )
	vBar.appendChild( document.createTextNode( vScore + '%' ) )

	// Describe the password strength.
	var vStrength = getByID( 'iStrength' )
	vStrength.removeChild( vStrength.firstChild )
	vStrength.appendChild( document.createTextNode( vComplexity ) )
	vStrength.style.color = vColour
}



// Returns the value of a specified name from cookie, if defined.

function readCookie( vName )
{
	var vValueList, vItem

	// Get the cookie, convert it into a list.
	vValueList = document.cookie.split( ';' )

	// For each item in the list...
	for ( var vIndex = 0; vIndex < vValueList.length; vIndex++ )
	{
		vItem = vValueList[ vIndex ]

		// Discard leading spaces.
		while ( vItem.charAt( 0 ) == ' ' )
		{
			vItem = vItem.substring( 1, vItem.length )
		}

		// If the item matches, return the value part.
		if ( vItem.indexOf( vName + '=' ) == 0 )
		{
			return vItem.substring( vName.length + 1,
									vItem.length ).replace( /\+/g, ' ' )
		}
	}

	// Return nothing if no matches were found.
	return ''
}



// Recursively removes DOM elements starting with the given node, which may
// also be removed if required.

function destroyTree( vParent )
{
	if ( vParent.hasChildNodes() )
	{
		for ( var vIndex = vParent.childNodes.length - 1;
			  vIndex >= 0; vIndex-- )
		{
			destroyTree( vParent.childNodes[ vIndex ] )
			vParent.removeChild( vParent.childNodes[ vIndex ] )
		}
	}
}



// Returns the DOM element with the specified ID.

function getByID( vID )
{
	return document.getElementById( vID )
}



// Decode link code whenever it changes.
window.onhashchange =
	function ()
	{
		decodeLink( location.hash.replace( /^#/, '' ), false )
	}

