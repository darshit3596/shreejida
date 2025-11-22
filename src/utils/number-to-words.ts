const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertLessThanOneThousand(n: number): string {
    let word = '';
    if (n % 100 < 20) {
        word = ones[n % 100];
        n = Math.floor(n / 100);
    } else {
        word = ones[n % 10];
        n = Math.floor(n / 10);

        word = tens[n % 10] + (word ? ' ' + word : '');
        n = Math.floor(n / 10);
    }
    if (n > 0) {
        word = ones[n] + ' Hundred' + (word ? ' ' + word : '');
    }
    return word;
}

export function toWords(num: number): string {
    if (num === 0) return 'Zero';

    const numStr = Math.floor(num).toString();
    if (numStr.length > 9) {
        return 'Number too large'; // Limit to 99,99,99,999
    }
    
    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const hundreds = Math.floor((num % 1000));

    let words = '';

    if (crore > 0) {
        words += convertLessThanOneThousand(crore) + ' Crore ';
    }
    if (lakh > 0) {
        words += convertLessThanOneThousand(lakh) + ' Lakh ';
    }
    if (thousand > 0) {
        words += convertLessThanOneThousand(thousand) + ' Thousand ';
    }
    if (hundreds > 0) {
        words += convertLessThanOneThousand(hundreds);
    }
    
    let result = words.trim();

    // Handle decimals (paise)
    const decimals = Math.round((num - Math.floor(num)) * 100);
    if (decimals > 0) {
        result += ' and ' + convertLessThanOneThousand(decimals) + ' Paise';
    }

    return result.replace(/\s+/g, ' ').trim();
}
