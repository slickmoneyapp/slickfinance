export type CurrencyOption = {
  code: string;
  flag: string;
  symbol: string | null;
  countries: string[];
};

/**
 * Dataset: country,flag,currency_code,symbol (user-provided).
 */
const RAW_DATASET = `
Afghanistan,🇦🇫,AFN,؋
Albania,🇦🇱,ALL,L
Algeria,🇩🇿,DZD,DA
Andorra,🇦🇩,EUR,€
Angola,🇦🇴,AOA,Kz
Antigua and Barbuda,🇦🇬,XCD,$
Argentina,🇦🇷,ARS,$
Armenia,🇦🇲,AMD,֏
Australia,🇦🇺,AUD,$
Austria,🇦🇹,EUR,€
Azerbaijan,🇦🇿,AZN,₼
Bahamas,🇧🇸,BSD,$
Bahrain,🇧🇭,BHD,BD
Bangladesh,🇧🇩,BDT,৳
Barbados,🇧🇧,BBD,$
Belarus,🇧🇾,BYN,Br
Belgium,🇧🇪,EUR,€
Belize,🇧🇿,BZD,$
Benin,🇧🇯,XOF,Fr
Bhutan,🇧🇹,BTN,Nu
Bolivia,🇧🇴,BOB,Bs
Bosnia and Herzegovina,🇧🇦,BAM,KM
Botswana,🇧🇼,BWP,P
Brazil,🇧🇷,BRL,R$
Brunei,🇧🇳,BND,$
Bulgaria,🇧🇬,BGN,лв
Burkina Faso,🇧🇫,XOF,Fr
Burundi,🇧🇮,BIF,FBu
Cambodia,🇰🇭,KHR,៛
Cameroon,🇨🇲,XAF,Fr
Canada,🇨🇦,CAD,$
Cape Verde,🇨🇻,CVE,$
Central African Republic,🇨🇫,XAF,Fr
Chad,🇹🇩,XAF,Fr
Chile,🇨🇱,CLP,$
China,🇨🇳,CNY,¥
Colombia,🇨🇴,COP,$
Comoros,🇰🇲,KMF,Fr
Congo (Congo-Brazzaville),🇨🇬,XAF,Fr
Costa Rica,🇨🇷,CRC,₡
Croatia,🇭🇷,EUR,€
Cuba,🇨🇺,CUP,$
Cyprus,🇨🇾,EUR,€
Czech Republic,🇨🇿,CZK,Kč
Denmark,🇩🇰,DKK,kr
Djibouti,🇩🇯,DJF,Fr
Dominica,🇩🇲,XCD,$
Dominican Republic,🇩🇴,DOP,$
Ecuador,🇪🇨,USD,$
Egypt,🇪🇬,EGP,E£
El Salvador,🇸🇻,USD,$
Equatorial Guinea,🇬🇶,XAF,Fr
Eritrea,🇪🇷,ERN,Nfk
Estonia,🇪🇪,EUR,€
Eswatini,🇸🇿,SZL,E
Ethiopia,🇪🇹,ETB,Br
Fiji,🇫🇯,FJD,$
Finland,🇫🇮,EUR,€
France,🇫🇷,EUR,€
Gabon,🇬🇦,XAF,Fr
Gambia,🇬🇲,GMD,D
Georgia,🇬🇪,GEL,₾
Germany,🇩🇪,EUR,€
Ghana,🇬🇭,GHS,₵
Greece,🇬🇷,EUR,€
Grenada,🇬🇩,XCD,$
Guatemala,🇬🇹,GTQ,Q
Guinea,🇬🇳,GNF,Fr
Guinea-Bissau,🇬🇼,XOF,Fr
Guyana,🇬🇾,GYD,$
Haiti,🇭🇹,HTG,G
Honduras,🇭🇳,HNL,L
Hungary,🇭🇺,HUF,Ft
Iceland,🇮🇸,ISK,kr
India,🇮🇳,INR,₹
Indonesia,🇮🇩,IDR,Rp
Iran,🇮🇷,IRR,﷼
Iraq,🇮🇶,IQD,ID
Ireland,🇮🇪,EUR,€
Israel,🇮🇱,ILS,₪
Italy,🇮🇹,EUR,€
Jamaica,🇯🇲,JMD,$
Japan,🇯🇵,JPY,¥
Jordan,🇯🇴,JOD,JD
Kazakhstan,🇰🇿,KZT,₸
Kenya,🇰🇪,KES,KSh
Kiribati,🇰🇮,AUD,$
Kuwait,🇰🇼,KWD,KD
Kyrgyzstan,🇰🇬,KGS,⃀
Laos,🇱🇦,LAK,₭
Latvia,🇱🇻,EUR,€
Lebanon,🇱🇧,LBP,£
Lesotho,🇱🇸,LSL,L
Liberia,🇱🇷,LRD,$
Libya,🇱🇾,LYD,LD
Liechtenstein,🇱🇮,CHF,Fr
Lithuania,🇱🇹,EUR,€
Luxembourg,🇱🇺,EUR,€
Madagascar,🇲🇬,MGA,Ar
Malawi,🇲🇼,MWK,K
Malaysia,🇲🇾,MYR,RM
Maldives,🇲🇻,MVR,Rf
Mali,🇲🇱,XOF,Fr
Malta,🇲🇹,EUR,€
Marshall Islands,🇲🇭,USD,$
Mauritania,🇲🇷,MRU,UM
Mauritius,🇲🇺,MUR,Rs
Mexico,🇲🇽,MXN,$
Micronesia,🇫🇲,USD,$
Moldova,🇲🇩,MDL,Leu
Monaco,🇲🇨,EUR,€
Mongolia,🇲🇳,MNT,₮
Montenegro,🇲🇪,EUR,€
Morocco,🇲🇦,MAD,dh
Mozambique,🇲🇿,MZN,Mt
Myanmar,🇲🇲,MMK,K
Namibia,🇳🇦,NAD,$
Nauru,🇳🇷,AUD,$
Nepal,🇳🇵,NPR,Rs
Netherlands,🇳🇱,EUR,€
New Zealand,🇳🇿,NZD,$
Nicaragua,🇳🇮,NIO,C$
Niger,🇳🇪,XOF,Fr
Nigeria,🇳🇬,NGN,₦
North Korea,🇰🇵,KPW,₩
North Macedonia,🇲🇰,MKD,den
Norway,🇳🇴,NOK,kr
Oman,🇴🇲,OMR,﷼
Pakistan,🇵🇰,PKR,Rs
Palau,🇵🇼,USD,$
Panama,🇵🇦,PAB,B/.
Papua New Guinea,🇵🇬,PGK,K
Paraguay,🇵🇾,PYG,₲
Peru,🇵🇪,PEN,S/
Philippines,🇵🇭,PHP,₱
Poland,🇵🇱,PLN,zł
Portugal,🇵🇹,EUR,€
Qatar,🇶🇦,QAR,QR
Romania,🇷🇴,RON,lei
Russia,🇷🇺,RUB,₽
Rwanda,🇷🇼,RWF,Fr
Saint Kitts and Nevis,🇰🇳,XCD,$
Saint Lucia,🇱🇨,XCD,$
Saint Vincent and the Grenadines,🇻🇨,XCD,$
Samoa,🇼🇸,WST,T
San Marino,🇸🇲,EUR,€
São Tomé and Príncipe,🇸🇹,STN,Db
Saudi Arabia,🇸🇦,SAR,﷼
Senegal,🇸🇳,XOF,Fr
Serbia,🇷🇸,RSD,din
Seychelles,🇸🇨,SCR,Rs
Sierra Leone,🇸🇱,SLE,Le
Singapore,🇸🇬,SGD,$
Slovakia,🇸🇰,EUR,€
Slovenia,🇸🇮,EUR,€
Solomon Islands,🇸🇧,SBD,$
Somalia,🇸🇴,SOS,Sh
South Africa,🇿🇦,ZAR,R
South Korea,🇰🇷,KRW,₩
South Sudan,🇸🇸,SSP,£
Spain,🇪🇸,EUR,€
Sri Lanka,🇱🇰,LKR,Rs
Sudan,🇸🇩,SDG,£
Suriname,🇸🇷,SRD,$
Sweden,🇸🇪,SEK,kr
Switzerland,🇨🇭,CHF,Fr
Syria,🇸🇾,SYP,£
Taiwan,🇹🇼,TWD,$
Tajikistan,🇹🇯,TJS,SM
Tanzania,🇹🇿,TZS,Sh
Thailand,🇹🇭,THB,฿
Timor-Leste,🇹🇱,USD,$
Togo,🇹🇬,XOF,Fr
Tonga,🇹🇴,TOP,T$
Trinidad and Tobago,🇹🇹,TTD,$
Tunisia,🇹🇳,TND,DT
Turkey,🇹🇷,TRY,₺
Turkmenistan,🇹🇲,TMT,m
Tuvalu,🇹🇻,AUD,$
Uganda,🇺🇬,UGX,Sh
Ukraine,🇺🇦,UAH,₴
United Arab Emirates,🇦🇪,AED,د.إ
United Kingdom,🇬🇧,GBP,£
United States,🇺🇸,USD,$
Uruguay,🇺🇾,UYU,$
Uzbekistan,🇺🇿,UZS,Sʻ
Vanuatu,🇻🇺,VUV,VT
Vatican City,🇻🇦,EUR,€
Venezuela,🇻🇪,VES,Bs
Vietnam,🇻🇳,VND,₫
Yemen,🇾🇪,YER,﷼
Zambia,🇿🇲,ZMW,K
Zimbabwe,🇿🇼,ZWG,ZiG
`.trim();

export function buildCurrencyOptions(): CurrencyOption[] {
  const rows = RAW_DATASET.split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [country, flag, codeRaw, symbol] = line.split(',').map((x) => (x ?? '').trim());
      return { country, flag, code: (codeRaw ?? '').toUpperCase(), symbol };
    })
    .filter((r) => r.code.length === 3);

  const byCode = new Map<string, CurrencyOption>();
  for (const r of rows) {
    const ex = byCode.get(r.code);
    if (!ex) {
      byCode.set(r.code, {
        code: r.code,
        flag: r.flag || '🏳️',
        symbol: r.symbol || null,
        countries: r.country ? [r.country] : [],
      });
    } else {
      if (r.country && !ex.countries.includes(r.country)) ex.countries.push(r.country);
    }
  }

  return Array.from(byCode.values()).sort((a, b) => a.code.localeCompare(b.code));
}

