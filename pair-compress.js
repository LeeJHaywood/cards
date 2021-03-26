/*
 *	Text compression using character pairs.
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
 */



// Define common pairs of English letters/symbols.
globalDictionary = 'subeditsunfoldtoilyo, sighless guru  overswinging  shirtwaist  nonhomogeneous, resplendencies  Interpellation  melodramatised  unseam  Acetabular  endarterectomy thow bedsonia  airproof  lido  flywheel  cofavorite  yamdowery haystack  doth woos inousechtcalicoutas TuladI  trihalomeThane. petrochemicals.  aifi whew . '



// Compresses common pairs of symbols (mainly English letters) as single byte
// values, returning the result as a list of numbers.  Unicode text is escaped
// and encoded as 2 bytes (using UTF-8 would be inefficient), and any rare
// non-BMP characters (such as U+1D306) will automatically end up using 4 bytes.

function pairCompress( vText )
{
	var vPosition, vChar, vNext, vIndex, vCode

	// For each (Unicode) character...
	var vResult = new Array
	var vBuffer = new Array
	var vNumBytes = 0
	var vNumBuffered = 0
	vPosition = 0
	while ( vPosition < vText.length )
	{
		// Buffer any non-ASCII byte values...
		vChar = vText.charAt( vPosition )
		if ( vChar < ' ' || vChar > '~' )
		{
			vBuffer[ vNumBuffered++ ] = vText.charCodeAt( vPosition++ )
		}
		// Otherwise...
		else
		{
			// Escape and output any buffered non-ASCII bytes.
			if ( vNumBuffered > 1 )
			{
				vResult[ vNumBytes++ ] = 255
				vResult[ vNumBytes++ ] = vNumBuffered - 1
				for ( vIndex = 0; vIndex < vNumBuffered; vIndex++ )
				{
					vResult[ vNumBytes++ ] =
								   parseInt( vBuffer[ vIndex ] / 256, 10 )
					vResult[ vNumBytes++ ] = vBuffer[ vIndex ] % 256
				}
			}
			else if ( vNumBuffered > 0 )
			{
				vResult[ vNumBytes++ ] = 127
				vResult[ vNumBytes++ ] = parseInt( vBuffer[ 0 ] / 256, 10 )
				vResult[ vNumBytes++ ] = vBuffer[ 0 ] % 256
			}

			// Discard the buffer.
			vNumBuffered = 0

			// If only one character remains, don't use the pair dictionary...
			if ( vPosition == vText.length - 1 )
			{
				vIndex = globalDictionary.length
			}
			// Otherwise...
			else
			{
				// Search for the current pair of characters in pair dictionary.
				vNext = vText.charAt( vPosition + 1 )
				for ( vIndex = 0;
					  vIndex < globalDictionary.length; vIndex += 2 )
				{
					if ( vChar == globalDictionary[ vIndex ] &&
						 vNext == globalDictionary[ vIndex + 1 ] )
					{
						break
					}
				}
			}

			// If current character pair can be compressed, add as one byte...
			if ( vIndex < globalDictionary.length )
			{
				vCode = vIndex / 2
				if ( vCode >= 32 )
				{
					vCode += ( 128 - 32 )
				}
				vResult[ vNumBytes++ ] = vCode
				vPosition += 2
			}
			// Otherwise, add the current value without compression.
			else
			{
				vResult[ vNumBytes++ ] = vText.charCodeAt( vPosition++ )
			}
		}
	}

	// Escape and output any remaining non-ASCII bytes.
	if ( vNumBuffered > 1 )
	{
		vResult[ vNumBytes++ ] = 255
		vResult[ vNumBytes++ ] = vNumBuffered - 1
		for ( vIndex = 0; vIndex < vNumBuffered; vIndex++ )
		{
			vResult[ vNumBytes++ ] = parseInt( vBuffer[ vIndex ] / 256, 10 )
			vResult[ vNumBytes++ ] = vBuffer[ vIndex ] % 256
		}
	}
	else if ( vNumBuffered > 0 )
	{
		vResult[ vNumBytes++ ] = 127
		vResult[ vNumBytes++ ] = parseInt( vBuffer[ 0 ] / 256, 10 )
		vResult[ vNumBytes++ ] = vBuffer[ 0 ] % 256
	}

	// Return the result.
	return vResult
}



// Restores text by expanding encoded pairs of symbols into their original
// form, and reconstructing any escaped (non-ASCII) Unicode characters.

function pairUncompress( vData )
{
	var vPosition, vCode, vLength

	// For each byte...
	var vResult = ''
	for ( vPosition = 0; vPosition < vData.length; vPosition++ )
	{
		vCode = vData[ vPosition ]

		// Add ASCII characters directly...
		if ( vCode >= 32 && vCode < 127 )
		{
			vResult += String.fromCharCode( vCode )
		}
		// Otherwise, if the value is escaped add the original bytes...
		else if ( vCode == 127 )
		{
			if ( vPosition + 2 >= vData.length )
			{
				throw 'Only have partial data'
			}
			vResult += String.fromCharCode( ( vData[ vPosition + 1 ] * 256 ) +
											vData[ vPosition + 2 ] )
			vPosition += 2
		}
		else if ( vCode == 255 )
		{
			if ( vPosition + 1 >= vData.length )
			{
				throw 'Only have partial data'
			}
			vLength = 1 + vData[ ++vPosition ]
			if ( vPosition + ( 2 * vLength ) >= vData.length )
			{
				throw 'Only have partial data'
			}
			while ( vLength-- > 0 )
			{
				vResult +=
						String.fromCharCode( ( vData[ vPosition + 1 ] * 256 ) +
											 vData[ vPosition + 2 ] )
				vPosition += 2
			}
		}
		// Otherwise, for a compressed pair, add the original ASCII characters.
		else
		{
			if ( vCode >= 128 )
			{
				vCode -= ( 128 - 32 )
			}

			vResult += globalDictionary[ vCode * 2 ] +
					   globalDictionary[ ( vCode * 2 ) + 1 ]
		}
	}

	// Return the result.
	return vResult
}

