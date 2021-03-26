/*****************************************************************************
 *
 *	Basic mathematical operations on arbitrarily large integers, with inputs
 *	and outputs always represented by well-formed text strings.
 *
 *	Copyright (C) 2014 by Lee J Haywood.
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
 *
 *****************************************************************************
 *
 *	Example inputs
 *
 *		Valid						Invalid
 *		-----						-------
 *		'0'							0
 *		'3'							2
 *		'40'						-3
 *		'-5'						'00'
 *		String( 6 )					'-0'
 *		'66405897020462343733'		'-01'
 *		'-71755440315342536873'		'+1'
 *
 *****************************************************************************/



// Returns the result of adding the 2 integers given.

function megaAdd( vX, vY )
{
	var vValue

	// If one input is positive and the other is negative...
	var vCount = ( vX.charAt( 0 ) == '-' ? -1 : 1 ) +
				 ( vY.charAt( 0 ) == '-' ? -1 : 1 )
	if ( vCount == 0 )
	{
		// If required, swap the inputs so that the first value is larger than
		// the second in absolute terms.
		if ( megaLessThan( megaAbsolute( vX ), megaAbsolute( vY ) ) )
		{
			var vTemp = vX
			vX = vY
			vY = vTemp
		}

		// Subtract the absolute values.
		var vResult = megaSubtract( megaAbsolute( vX ), megaAbsolute( vY ) )

		// If the first value was negative, negate and return the result.
		if ( vX.charAt( 0 ) == '-' )
		{
			return ( vResult == '0' ? '0' : '-' + vResult )
		}

		// Otherwise, return the positive result.
		return vResult
	}

	// If both inputs are negative, just add their absolute values and
	// return the negated result.
	if ( vCount < 0 )
	{
		vValue = megaAdd( megaAbsolute( vX ), megaAbsolute( vY ) )
		return ( vValue == '0' ? '0' : '-' + vValue )
	}

	// Determine which number is longest.
	var vMaxLength = Math.max( vX.length, vY.length )

	// For each position, from right to left...
	var vResult = ''
	var vCarry = 0
	var vNumZeroes = 0
	for ( var vIndex = 1; vIndex <= vMaxLength; vIndex++ )
	{
		// Add the digits, and add any amount already carried over.
		vValue = Number( vX.charAt( vX.length - vIndex ) ) +
				 Number( vY.charAt( vY.length - vIndex ) ) + vCarry

		// Reduce the answer to a single digit, carry the rest.
		vCarry = 0
		while ( vValue >= 10 )
		{
			vValue -= 10
			vCarry++
		}

		// Count leading zeros, or pad with any existing leading zeros.
		if ( vValue == 0 )
		{
			vNumZeroes++
		}
		else
		{
			vResult = String( vValue ) + prefixZeros( vResult, vNumZeroes )
			vNumZeroes = 0
		}
	}

	// Combine any remaining carried digits with the final total, including any
	// leading zeros between them.
	vResult = prefixZeros( vResult, vNumZeroes )
	if ( vCarry > 0 )
	{
		vResult = String( vCarry ) + vResult
	}

	// Return the result.
	return vResult
}



// Returns the result of subtracting the second integer given from the first.

function megaSubtract( vX, vY )
{
	var vFirst, vSecond, vValue

	// If either value is negative, or the second value is greater than the
	// first, just add the negated second value to the first and return result.
	if ( vX.charAt( 0 ) == '-' || vY.charAt( 0 ) == '-' ||
		 megaLessThan( megaAbsolute( vX ), megaAbsolute( vY ) ) )
	{
		if ( vY != '0' )
		{
			vY = ( vY.charAt( 0 ) == '-' ? vY.substr( 1 ) : '-' + vY )
		}
		return megaAdd( vX, vY )
	}

	// Determine which number is longest.
	var vMaxLength = Math.max( vX.length, vY.length )

	// For each position, from right to left...
	var vResult = ''
	var vCarry = 0
	var vNumZeros = 0
	for ( var vIndex = 1; vIndex <= vMaxLength; vIndex++ )
	{
		// Subtract any amount carried from the first number's digit, and get
		// the second number's digit.
		vFirst = Number( vX.charAt( vX.length - vIndex ) ) - vCarry
		vSecond = Number( vY.charAt( vY.length - vIndex ) )

		// Force the first value to be at least as big as the second.
		vCarry = 0
		while ( vFirst < vSecond )
		{
			vFirst += 10
			vCarry++
		}

		// If the values are equal then count as a leading zero, otherwise
		// add the new digits to the start of the result.
		vValue = vFirst - vSecond
		if ( vValue == 0 )
		{
			vNumZeros++
		}
		else
		{
			vResult = String( vValue ) + prefixZeros( vResult, vNumZeros )
			vNumZeros = 0
		}
	}

	// Return the result.
	return ( vResult.length == 0 ? '0' : vResult )
}



// Returns the result of multiplying the 2 integers given.

function megaMultiply( vX, vY )
{
	var vDigit, vRow, vValue, vCarry, vNumZeros, vIndex2, vCount

	// Note if one input is positive and the other negative.
	var vNegate = ( ( vX.charAt( 0 ) == '-' ? -1 : 1 ) +
					( vY.charAt( 0 ) == '-' ? -1 : 1 ) == 0 )

	// Switch to absolute values.
	vX = megaAbsolute( vX )
	vY = megaAbsolute( vY )

	// Just return zero if either input is zero.
	if ( vX == '0' || vY == '0' )
	{
		return '0'
	}

	// For each of the digits in the first number...
	var vResult = '0'
	var vNumDigitsX = vX.length
	var vNumDigitsY = vY.length
	for ( var vIndex = 1; vIndex <= vNumDigitsX; vIndex++ )
	{
		vDigit = Number( vX.charAt( vNumDigitsX - vIndex ) )

		// For each digit in the second number...
		vRow = ''
		vCarry = 0
		vNumZeros = 0
		for ( vIndex2 = 1; vIndex2 <= vNumDigitsY; vIndex2++ )
		{
			// Multiply by the digit provided, and add any value carried over.
			vValue = ( vY.charAt( vNumDigitsY - vIndex2 ) * vDigit ) + vCarry

			// Reduce the answer to a single digit, carry the rest.
			vCarry = 0
			while ( vValue >= 10 )
			{
				vValue -= 10
				vCarry++
			}

			// If the result is zero then count as a leading zero, otherwise add
			// the new digits to the start of the result along with any zeros
			// required in between.
			if ( vValue == 0 )
			{
				vNumZeros++
			}
			else
			{
				vRow = String( vValue ) + prefixZeros( vRow, vNumZeros )
				vNumZeros = 0
			}
		}

		// Combine any remaining carried digits with the final total, including
		// any leading zeros between them.
		if ( vCarry > 0 )
		{
			vRow = String( vCarry ) + prefixZeros( vRow, vNumZeros )
		}

		// Shift the digits left.
		vCount = vIndex
		while ( --vCount > 0 )
		{
			vRow = vRow + '0'
		}

		// Add the result for the current digit of the second number to the
		// overall result.
		vResult = megaAdd( vResult, vRow )
	}

	// Negate the answer if required, then return the result.
	return ( vNegate ? '-' : '' ) + vResult
}



// Returns the result of dividing the first integer given by the second, along
// with the remainder (modulus).

function megaDivide( vX, vY )
{
	var vDigits

	// Remember the inputs in case an error occurs.
	var vInputs  = vX + '/' + vY

	// Fail if dividing by zero.
	if ( vY == '0' )
	{
		throw new Error( 'Cannot divide by zero (' + vInputs + ')' )
	}

	// Note if one input is positive and the other negative.
	var vNegate = ( ( vX.charAt( 0 ) == '-' ? -1 : 1 ) +
					( vY.charAt( 0 ) == '-' ? -1 : 1 ) == 0 )

	// Switch to absolute values.
	vX = megaAbsolute( vX )
	vY = megaAbsolute( vY )

	// If the numerator/denominator are equal, return 1 with a zero remainder.
	if ( vY == vX )
	{
		return [ ( vNegate ? '-1' : '1' ), '0' ]
	}

	// If the numerator is smaller than the denominator, return zero with the
	// numerator as the remainder.
	if ( megaLessThan( vX, vY ) )
	{
		return [ '0', ( vNegate && vX != '0' ? '-' : '' ) + vX ]
	}

	// Loop until the answer is found or no digits remain...
	var vQuotient = '0'
	var vNumDigits = ( vX.length - vY.length )
	do
	{
		vDigits = vX.slice( 0, vX.length - vNumDigits )

		// Subtract as long as possible and count the times.
		while ( ! megaLessThan( vDigits, vY ) )
		{
			vDigits = megaSubtract( vDigits, vY )
			vQuotient = megaAdd( vQuotient, '1' )
		}
		vX = vDigits + vX.slice( vX.length - vNumDigits )

		// If the division can be completed...
		if ( megaLessThan( vX, vY ) )
		{
			// Shift the quotient left for any remaining places.
			while ( vNumDigits-- > 0 )
			{
				vQuotient = vQuotient + '0'
			}

			// Discard unwanted leading zeros from the remainder.
			while ( vX.charAt( 0 ) == '0' && vX != '0' )
			{
				vX = vX.substr( 1 )
			}

			// Return the result, negating the quotient if required.
			return [ ( vNegate ? '-' : '' ) + vQuotient, vX ]
		}

		// Discount the digit and add a zero to the quotient.
		vNumDigits--
		if ( vQuotient != '0' )
		{
			vQuotient = vQuotient + '0'
		}
	}
	while ( vNumDigits >= 0 )

	// Handle the error.
	throw new Error( 'Failed to divide (' + vInputs + ')' )
}



// Removes the leading minus sign from the given integer if it is negative and
// returns the result.

function megaAbsolute( vValue )
{
	return ( vValue.charAt( 0 ) == '-' ? vValue.substr( 1 ) : vValue )
}



// Returns true if the first non-negative integer specified is less than the
// second.

function megaLessThan( vX, vY )
{
//	// Return true if the first number is negative and the second isn't.
//	if ( vX.charAt( 0 ) == '-' && vY.charAt( 0 ) != '-' )
//	{
//		return true
//	}
//
//	// Return false if the first number isn't negative and the second is.
//	if ( vX.charAt( 0 ) != '-' && vY.charAt( 0 ) == '-' )
//	{
//		return false
//	}
//
//	// If both numbers are positive, swap the numbers and compare absolutes.
//	if ( vX.charAt( 0 ) == '-' )
//	{
//		var vTemp = vX.substr( 1 )
//		vX = vY.substr( 1 )
//		vY = vTemp
//	}

	// Prefix the numbers with zeros to make them the same length, then compare
	// them as strings and return the result.
	var maxLength = Math.max( vX.length, vY.length )
	return prefixZeros( vX, maxLength - vX.length ) <
				prefixZeros( vY, maxLength - vY.length )
}



// Prefixes the given value with the specified number of zero digits.

function prefixZeros( vValue, vNumZeros )
{
	while ( vNumZeros-- > 0 )
	{
		vValue = '0' + vValue
	}
	return vValue
}

