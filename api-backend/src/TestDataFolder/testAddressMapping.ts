import { faker } from "@faker-js/faker";

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  state: string;
  latitude?: number;
  longitude?: number;
}

export interface CampaignLocation {
  placeName: string;
  address: Address;
}

// Helper functions for Malaysian addresses
export function getStateFromCity(city: string): string {
  const stateMapping: Record<string, string> = {
    'Kuala Lumpur': 'Kuala Lumpur',
    'Shah Alam': 'Selangor',
    'Petaling Jaya': 'Selangor',
    'Klang': 'Selangor',
    'Subang Jaya': 'Selangor',
    'Puchong': 'Selangor',
    'Cheras': 'Kuala Lumpur',
    'Bangsar': 'Kuala Lumpur',
    'Setapak': 'Kuala Lumpur',
    'Brickfields': 'Kuala Lumpur',
    'Damansara': 'Kuala Lumpur',
    'TTDI': 'Kuala Lumpur',
    'Chow Kit': 'Kuala Lumpur',
    'Pasar Seni': 'Kuala Lumpur',
    'USJ': 'Selangor',
    'Seksyen 7': 'Selangor',
    'Seksyen 13': 'Selangor',
    'Seksyen 17': 'Selangor',
    'Taman Maluri': 'Kuala Lumpur',
    'Taman Desa': 'Kuala Lumpur',
    'Taman Paramount': 'Selangor',
    'Taman SEA': 'Selangor',
    'Damansara Jaya': 'Selangor',
    'Taman Midah': 'Kuala Lumpur',
    'Taman Connaught': 'Kuala Lumpur',
    'Salak South': 'Kuala Lumpur',
    'Taman Tun Dr Ismail': 'Kuala Lumpur'
  };
  
  return stateMapping[city] || 'Selangor';
}

export function generateMalaysianStreetAddress(): string {
  const prefixes = ['Jalan', 'Lorong', 'Persiaran', 'Jalan Besar', 'Lebuh', 'Jalan Tengah'];
  const streetNames = ['Raja', 'Sultan', 'Tun', 'Imbi', 'Bukit', 'Damansara', 'Kuala', 'Ipoh', 'Penang', 'Melaka', 'Kedah', 'Perak', 'Kelantan', 'Terengganu'];
  const suffixes = ['', ' Barat', ' Timur', ' Utara', ' Selatan', ' Besar', ' Kecil'];
  
  const prefix = faker.helpers.arrayElement(prefixes);
  const street = faker.helpers.arrayElement(streetNames);
  const suffix = faker.helpers.arrayElement(suffixes);
  const number = faker.number.int({ min: 1, max: 999 });
  
  return `${number}, ${prefix} ${street}${suffix}`;
}

export function generatePostalCodeForCity(city: string): string {
  const postalCodeMapping: Record<string, string[]> = {
    'Kuala Lumpur': ['50000', '50100', '50200', '50300', '50400', '50500', '50600', '50700', '50800', '50900'],
    'Shah Alam': ['40000', '40100', '40200', '40300', '40400', '40500'],
    'Petaling Jaya': ['46000', '46100', '46200', '46300', '46400', '46500', '46600', '46700', '46800', '46900', '47000'],
    'Klang': ['41000', '41100', '41200', '41300', '41400', '41500'],
    'Subang Jaya': ['47500', '47600', '47610', '47620', '47630', '47640', '47650'],
    'Puchong': ['47100', '47110', '47120', '47130'],
    'Cheras': ['56000', '56100', '56200', '56300'],
    'Bangsar': ['59000', '59100', '59200'],
    'Setapak': ['53000', '53100', '53200'],
    'Brickfields': ['50470', '50480', '50490'],
    'Damansara': ['47800', '47810', '47820'],
    'TTDI': ['60000', '60010', '60020'],
    'Chow Kit': ['50350', '50360'],
    'Pasar Seni': ['50000', '50050'],
    'USJ': ['47610', '47620', '47630'],
    'Seksyen 7': ['40000', '40010'],
    'Seksyen 13': ['40100', '40110'],
    'Seksyen 17': ['46400', '46410'],
    'Taman Maluri': ['55100', '55110'],
    'Taman Desa': ['58100', '58110'],
    'Taman Paramount': ['46300', '46310'],
    'Taman SEA': ['47400', '47410'],
    'Damansara Jaya': ['47400', '47410'],
    'Taman Midah': ['56000', '56010'],
    'Taman Connaught': ['56000', '56010'],
    'Salak South': ['57100', '57110'],
    'Taman Tun Dr Ismail': ['60000', '60010']
  };
  
  const codes = postalCodeMapping[city];
  return codes ? faker.helpers.arrayElement(codes) : faker.location.zipCode();
}

export function formatAddress(address: Address): string {
  return `${address.street}, ${address.postalCode} ${address.city}, ${address.state}`;
}
// Donor Address Mapping (Chain -> Location -> Address)
export const DONOR_ADDRESS_MAPPING: Record<string, Record<string, Address>> = {
  // Restaurants
  "KFC Malaysia": {
    "Kuala Lumpur": {
      street: "Lot 1.77.00, Level 1, Pavilion Kuala Lumpur",
      city: "Kuala Lumpur",
      postalCode: "55100",
      state: "Kuala Lumpur",
      latitude: 3.1487,
      longitude: 101.7112
    },
    "Petaling Jaya": {
      street: "Lot G221, Ground Floor, 1 Utama Shopping Centre",
      city: "Petaling Jaya",
      postalCode: "47800",
      state: "Selangor",
      latitude: 3.1474,
      longitude: 101.6157
    },
    "Subang Jaya": {
      street: "Lot G25, Ground Floor, Subang Parade",
      city: "Subang Jaya",
      postalCode: "47500",
      state: "Selangor",
      latitude: 3.0832,
      longitude: 101.5864
    }
  },
  "McDonald's": {
    "Kuala Lumpur": {
      street: "Lot G85, Ground Floor, Suria KLCC",
      city: "Kuala Lumpur",
      postalCode: "50088",
      state: "Kuala Lumpur",
      latitude: 3.1579,
      longitude: 101.7117
    },
    "Shah Alam": {
      street: "Lot G45, Ground Floor, SACC Mall",
      city: "Shah Alam",
      postalCode: "40000",
      state: "Selangor",
      latitude: 3.0731,
      longitude: 101.5184
    },
    "Klang": {
      street: "No. 2, Jalan Batu Tiga Lama",
      city: "Klang",
      postalCode: "41300",
      state: "Selangor",
      latitude: 3.0442,
      longitude: 101.4455
    }
  },
  "Pizza Hut": {
    "Petaling Jaya": {
      street: "Lot 1-01, First Floor, Paradigm Mall",
      city: "Petaling Jaya",
      postalCode: "47400",
      state: "Selangor",
      latitude: 3.1189,
      longitude: 101.5835
    },
    "Kuala Lumpur": {
      street: "No. 123, Jalan Bukit Bintang",
      city: "Kuala Lumpur",
      postalCode: "55100",
      state: "Kuala Lumpur",
      latitude: 3.1478,
      longitude: 101.7119
    }
  },
  "Nando's": {
    "Kuala Lumpur": {
      street: "Lot 3.01.03, Level 3, Pavilion Kuala Lumpur",
      city: "Kuala Lumpur",
      postalCode: "55100",
      state: "Kuala Lumpur",
      latitude: 3.1487,
      longitude: 101.7112
    },
    "Petaling Jaya": {
      street: "Lot F123, First Floor, The Curve",
      city: "Petaling Jaya",
      postalCode: "47800",
      state: "Selangor",
      latitude: 3.1470,
      longitude: 101.6153
    }
  },
  "PappaRich": {
    "Kuala Lumpur": {
      street: "Lot 4.88.00, Level 4, Pavilion Kuala Lumpur",
      city: "Kuala Lumpur",
      postalCode: "55100",
      state: "Kuala Lumpur",
      latitude: 3.1487,
      longitude: 101.7112
    },
    "Shah Alam": {
      street: "Lot G34, Ground Floor, Setia City Mall",
      city: "Shah Alam",
      postalCode: "40170",
      state: "Selangor",
      latitude: 3.0339,
      longitude: 101.5707
    }
  },
  "The Chicken Rice Shop": {
    "Petaling Jaya": {
      street: "Lot G78, Ground Floor, 1 Utama Shopping Centre",
      city: "Petaling Jaya",
      postalCode: "47800",
      state: "Selangor",
      latitude: 3.1474,
      longitude: 101.6157
    },
    "Klang": {
      street: "No. 45, Jalan Batu Tiga Lama",
      city: "Klang",
      postalCode: "41300",
      state: "Selangor",
      latitude: 3.0442,
      longitude: 101.4455
    }
  },
  "Secret Recipe": {
    "Kuala Lumpur": {
      street: "Lot 2.01.02, Level 2, Mid Valley Megamall",
      city: "Kuala Lumpur",
      postalCode: "59200",
      state: "Kuala Lumpur",
      latitude: 3.1177,
      longitude: 101.6768
    },
    "Subang Jaya": {
      street: "Lot F12, First Floor, Empire Subang",
      city: "Subang Jaya",
      postalCode: "47650",
      state: "Selangor",
      latitude: 3.0832,
      longitude: 101.5864
    }
  },
  "OldTown White Coffee": {
    "Shah Alam": {
      street: "Lot G23, Ground Floor, SACC Mall",
      city: "Shah Alam",
      postalCode: "40000",
      state: "Selangor",
      latitude: 3.0731,
      longitude: 101.5184
    },
    "Klang": {
      street: "No. 12, Jalan Batu Tiga Lama",
      city: "Klang",
      postalCode: "41300",
      state: "Selangor",
      latitude: 3.0442,
      longitude: 101.4455
    }
  },

  // Hypermarkets
  "AEON BiG": {
    "Shah Alam": {
      street: "Lot 1, Persiaran Pegawai, Seksyen 32",
      city: "Shah Alam",
      postalCode: "40400",
      state: "Selangor",
      latitude: 3.0450,
      longitude: 101.5215
    },
    "Kuala Lumpur": {
      street: "Lot 123, Jalan Klang Lama",
      city: "Kuala Lumpur",
      postalCode: "58200",
      state: "Kuala Lumpur",
      latitude: 3.1177,
      longitude: 101.6768
    },
    "Petaling Jaya": {
      street: "Lot 456, Jalan SS2/24",
      city: "Petaling Jaya",
      postalCode: "47300",
      state: "Selangor",
      latitude: 3.1189,
      longitude: 101.5835
    }
  },
  "Giant Hypermarket": {
    "Shah Alam": {
      street: "Lot 2, Persiaran Perbandaran",
      city: "Shah Alam",
      postalCode: "40000",
      state: "Selangor",
      latitude: 3.0731,
      longitude: 101.5184
    },
    "Subang Jaya": {
      street: "Lot G15, Ground Floor, Subang Parade",
      city: "Subang Jaya",
      postalCode: "47500",
      state: "Selangor",
      latitude: 3.0832,
      longitude: 101.5864
    },
    "Klang": {
      street: "No. 56, Jalan Meru",
      city: "Klang",
      postalCode: "41050",
      state: "Selangor",
      latitude: 3.0442,
      longitude: 101.4455
    }
  },
  "Tesco": {
    "Kuala Lumpur": {
      street: "Lot 789, Jalan Cheras",
      city: "Kuala Lumpur",
      postalCode: "56000",
      state: "Kuala Lumpur",
      latitude: 3.1377,
      longitude: 101.7189
    },
    "Shah Alam": {
      street: "Lot 3, Persiaran Dato' Menteri",
      city: "Shah Alam",
      postalCode: "40000",
      state: "Selangor",
      latitude: 3.0731,
      longitude: 101.5184
    }
  },
  "NSK Trade City": {
    "Shah Alam": {
      street: "Lot 10, Persiaran Dato' Menteri",
      city: "Shah Alam",
      postalCode: "40000",
      state: "Selangor",
      latitude: 3.0731,
      longitude: 101.5184
    },
    "Petaling Jaya": {
      street: "Lot 20, Jalan SS2/67",
      city: "Petaling Jaya",
      postalCode: "47300",
      state: "Selangor",
      latitude: 3.1189,
      longitude: 101.5835
    }
  },
  "Econsave": {
    "Klang": {
      street: "No. 34, Jalan Kapar",
      city: "Klang",
      postalCode: "41400",
      state: "Selangor",
      latitude: 3.0442,
      longitude: 101.4455
    },
    "Subang Jaya": {
      street: "Lot G30, Ground Floor, Subang Parade",
      city: "Subang Jaya",
      postalCode: "47500",
      state: "Selangor",
      latitude: 3.0832,
      longitude: 101.5864
    }
  },
  "Mydin": {
    "Kuala Lumpur": {
      street: "Lot 456, Jalan Masjid India",
      city: "Kuala Lumpur",
      postalCode: "50100",
      state: "Kuala Lumpur",
      latitude: 3.1479,
      longitude: 101.6965
    },
    "Shah Alam": {
      street: "Lot 5, Persiaran Perbandaran",
      city: "Shah Alam",
      postalCode: "40000",
      state: "Selangor",
      latitude: 3.0731,
      longitude: 101.5184
    }
  },

  // Hotels
  "Hilton Kuala Lumpur": {
    "Kuala Lumpur": {
      street: "3, Jalan Stesen Sentral",
      city: "Kuala Lumpur",
      postalCode: "50470",
      state: "Kuala Lumpur",
      latitude: 3.1357,
      longitude: 101.6880
    }
  },
  "Sheraton Imperial": {
    "Kuala Lumpur": {
      street: "Jalan Sultan Ismail",
      city: "Kuala Lumpur",
      postalCode: "50250",
      state: "Kuala Lumpur",
      latitude: 3.1508,
      longitude: 101.7135
    }
  },
  "Le Meridien Kuala Lumpur": {
    "Kuala Lumpur": {
      street: "2, Jalan Stesen Sentral",
      city: "Kuala Lumpur",
      postalCode: "50470",
      state: "Kuala Lumpur",
      latitude: 3.1357,
      longitude: 101.6880
    }
  },
  "Concorde Hotel Shah Alam": {
    "Shah Alam": {
      street: "Persiaran Perbandaran",
      city: "Shah Alam",
      postalCode: "40000",
      state: "Selangor",
      latitude: 3.0731,
      longitude: 101.5184
    }
  },
  "Glenmarie Hotel & Golf Resort": {
    "Shah Alam": {
      street: "1, Jalan Kontraktor U1/14",
      city: "Shah Alam",
      postalCode: "40150",
      state: "Selangor",
      latitude: 3.0731,
      longitude: 101.5184
    }
  },
  "One World Hotel": {
    "Petaling Jaya": {
      street: "First Avenue, Bandar Utama",
      city: "Petaling Jaya",
      postalCode: "47800",
      state: "Selangor",
      latitude: 3.1470,
      longitude: 101.6153
    }
  },
  "Sunway Resort Hotel": {
    "Petaling Jaya": {
      street: "Persiaran Lagoon, Bandar Sunway",
      city: "Petaling Jaya",
      postalCode: "47500",
      state: "Selangor",
      latitude: 3.0716,
      longitude: 101.6051
    }
  },
  "Royale Chulan Kuala Lumpur": {
    "Kuala Lumpur": {
      street: "5, Jalan Conlay",
      city: "Kuala Lumpur",
      postalCode: "50450",
      state: "Kuala Lumpur",
      latitude: 3.1533,
      longitude: 101.7137
    }
  }
};

// Volunteer (NGO) Office Addresses and Campaign Locations
export const VOLUNTEER_MAPPING: Record<string, {
  officeAddress: Address;
  campaignLocations: CampaignLocation[];
}> = {
  "Malaysian Red Crescent Society": {
    officeAddress: {
      street: "32, Jalan Nipah",
      city: "Kuala Lumpur",
      postalCode: "55000",
      state: "Kuala Lumpur",
      latitude: 3.1737,
      longitude: 101.7003
    },
    campaignLocations: [
      {
        placeName: "Pusat Komuniti Taman Maluri",
        address: {
          street: "Jalan Jejaka, Taman Maluri",
          city: "Kuala Lumpur",
          postalCode: "55100",
          state: "Kuala Lumpur",
          latitude: 3.1288,
          longitude: 101.7277
        }
      },
      {
        placeName: "Dewan Serbaguna Taman Desa",
        address: {
          street: "Jalan Desa, Taman Desa",
          city: "Kuala Lumpur",
          postalCode: "58100",
          state: "Kuala Lumpur",
          latitude: 3.1076,
          longitude: 101.6793
        }
      },
      {
        placeName: "Pusat Aktiviti Setapak",
        address: {
          street: "Jalan Air Jernih, Setapak",
          city: "Kuala Lumpur",
          postalCode: "53000",
          state: "Kuala Lumpur",
          latitude: 3.1998,
          longitude: 101.7054
        }
      }
    ]
  },
  "Pertubuhan Kebajikan Islam Malaysia": {
    officeAddress: {
      street: "No. 55, Jalan Jelawat 1",
      city: "Shah Alam",
      postalCode: "40000",
      state: "Selangor",
      latitude: 3.0731,
      longitude: 101.5184
    },
    campaignLocations: [
      {
        placeName: "Surau Al-Amin Seksyen 7",
        address: {
          street: "Jalan Plumbum 7/101, Seksyen 7",
          city: "Shah Alam",
          postalCode: "40000",
          state: "Selangor",
          latitude: 3.0731,
          longitude: 101.5184
        }
      },
      {
        placeName: "Dewan Serbaguna Seksyen 13",
        address: {
          street: "Jalan Tembaga 13/40, Seksyen 13",
          city: "Shah Alam",
          postalCode: "40100",
          state: "Selangor",
          latitude: 3.0658,
          longitude: 101.5329
        }
      },
      {
        placeName: "Masjid Sultan Salahuddin Abdul Aziz Shah",
        address: {
          street: "Persiaran Masjid",
          city: "Shah Alam",
          postalCode: "40000",
          state: "Selangor",
          latitude: 3.0731,
          longitude: 101.5184
        }
      }
    ]
  },
  "Rumah Kebajikan Seri Eden": {
    officeAddress: {
      street: "No. 12, Jalan SS2/24",
      city: "Petaling Jaya",
      postalCode: "47300",
      state: "Selangor",
      latitude: 3.1189,
      longitude: 101.5835
    },
    campaignLocations: [
      {
        placeName: "Pusat Komuniti SS2",
        address: {
          street: "Jalan SS2/60",
          city: "Petaling Jaya",
          postalCode: "47300",
          state: "Selangor",
          latitude: 3.1189,
          longitude: 101.5835
        }
      },
      {
        placeName: "Dewan Serbaguna Taman Paramount",
        address: {
          street: "Jalan 20/7, Taman Paramount",
          city: "Petaling Jaya",
          postalCode: "46300",
          state: "Selangor",
          latitude: 3.1044,
          longitude: 101.6293
        }
      },
      {
        placeName: "Pusat Aktiviti Seksyen 17",
        address: {
          street: "Jalan 17/1, Seksyen 17",
          city: "Petaling Jaya",
          postalCode: "46400",
          state: "Selangor",
          latitude: 3.1104,
          longitude: 101.6395
        }
      }
    ]
  },
  "Food Aid Foundation": {
    officeAddress: {
      street: "No. 5, Jalan SS3/29",
      city: "Petaling Jaya",
      postalCode: "47300",
      state: "Selangor",
      latitude: 3.1189,
      longitude: 101.5835
    },
    campaignLocations: [
      {
        placeName: "Pusat Agihan Makanan Petaling Jaya",
        address: {
          street: "Jalan SS2/75",
          city: "Petaling Jaya",
          postalCode: "47300",
          state: "Selangor",
          latitude: 3.1189,
          longitude: 101.5835
        }
      },
      {
        placeName: "Dewan Serbaguna Taman Tun Dr Ismail",
        address: {
          street: "Jalan Tun Mohd Fuad 1, TTDI",
          city: "Kuala Lumpur",
          postalCode: "60000",
          state: "Kuala Lumpur",
          latitude: 3.1408,
          longitude: 101.6315
        }
      },
      {
        placeName: "Pusat Komuniti Bangsar",
        address: {
          street: "Jalan Telawi, Bangsar",
          city: "Kuala Lumpur",
          postalCode: "59100",
          state: "Kuala Lumpur",
          latitude: 3.1288,
          longitude: 101.6671
        }
      }
    ]
  },
  "Kechara Soup Kitchen": {
    officeAddress: {
      street: "No. 33, Jalan Bukit Bintang",
      city: "Kuala Lumpur",
      postalCode: "55100",
      state: "Kuala Lumpur",
      latitude: 3.1478,
      longitude: 101.7119
    },
    campaignLocations: [
      {
        placeName: "Pusat Agihan Chow Kit",
        address: {
          street: "Jalan Chow Kit",
          city: "Kuala Lumpur",
          postalCode: "50350",
          state: "Kuala Lumpur",
          latitude: 3.1657,
          longitude: 101.6985
        }
      },
      {
        placeName: "Dewan Serbaguna Pasar Seni",
        address: {
          street: "Jalan Sultan, Pasar Seni",
          city: "Kuala Lumpur",
          postalCode: "50000",
          state: "Kuala Lumpur",
          latitude: 3.1466,
          longitude: 101.6958
        }
      },
      {
        placeName: "Pusat Komuniti Brickfields",
        address: {
          street: "Jalan Berhala, Brickfields",
          city: "Kuala Lumpur",
          postalCode: "50470",
          state: "Kuala Lumpur",
          latitude: 3.1272,
          longitude: 101.6866
        }
      }
    ]
  },
  "Pertiwi Soup Kitchen": {
    officeAddress: {
      street: "No. 8, Jalan SS15/4",
      city: "Subang Jaya",
      postalCode: "47500",
      state: "Selangor",
      latitude: 3.0832,
      longitude: 101.5864
    },
    campaignLocations: [
      {
        placeName: "Pusat Agihan Subang Jaya",
        address: {
          street: "Jalan SS15/8",
          city: "Subang Jaya",
          postalCode: "47500",
          state: "Selangor",
          latitude: 3.0832,
          longitude: 101.5864
        }
      },
      {
        placeName: "Dewan Serbaguna USJ",
        address: {
          street: "Jalan USJ 9/5",
          city: "Subang Jaya",
          postalCode: "47620",
          state: "Selangor",
          latitude: 3.0497,
          longitude: 101.5831
        }
      },
      {
        placeName: "Pusat Komuniti Puchong",
        address: {
          street: "Jalan PUCHONG",
          city: "Puchong",
          postalCode: "47100",
          state: "Selangor",
          latitude: 3.0224,
          longitude: 101.6156
        }
      }
    ]
  },
  "Project Hope Malaysia": {
    officeAddress: {
      street: "No. 15, Jalan Klang Lama",
      city: "Kuala Lumpur",
      postalCode: "58000",
      state: "Kuala Lumpur",
      latitude: 3.1177,
      longitude: 101.6768
    },
    campaignLocations: [
      {
        placeName: "Pusat Harapan Cheras",
        address: {
          street: "Jalan Cheras, Taman Midah",
          city: "Kuala Lumpur",
          postalCode: "56000",
          state: "Kuala Lumpur",
          latitude: 3.0930,
          longitude: 101.7454
        }
      },
      {
        placeName: "Dewan Serbaguna Taman Connaught",
        address: {
          street: "Jalan Cerdas, Taman Connaught",
          city: "Kuala Lumpur",
          postalCode: "56000",
          state: "Kuala Lumpur",
          latitude: 3.0845,
          longitude: 101.7371
        }
      },
      {
        placeName: "Pusat Aktiviti Salak South",
        address: {
          street: "Jalan Salak South",
          city: "Kuala Lumpur",
          postalCode: "57100",
          state: "Kuala Lumpur",
          latitude: 3.1005,
          longitude: 101.6922
        }
      }
    ]
  },
  "Yayasan MSU": {
    officeAddress: {
      street: "University Drive, Section 13",
      city: "Shah Alam",
      postalCode: "40100",
      state: "Selangor",
      latitude: 3.0731,
      longitude: 101.5184
    },
    campaignLocations: [
      {
        placeName: "Dewan Kuliah Utama MSU",
        address: {
          street: "University Drive, Section 13",
          city: "Shah Alam",
          postalCode: "40100",
          state: "Selangor",
          latitude: 3.0731,
          longitude: 101.5184
        }
      },
      {
        placeName: "Pusat Komuniti Seksyen 7",
        address: {
          street: "Jalan Plumbum 7/101, Seksyen 7",
          city: "Shah Alam",
          postalCode: "40000",
          state: "Selangor",
          latitude: 3.0731,
          longitude: 101.5184
        }
      },
      {
        placeName: "Dewan Serbaguna UiTM",
        address: {
          street: "Jalan Ilmu 1/1",
          city: "Shah Alam",
          postalCode: "40450",
          state: "Selangor",
          latitude: 3.0731,
          longitude: 101.5184
        }
      }
    ]
  },
  "Yayasan Sunbeams Home": {
    officeAddress: {
      street: "No. 22, Jalan SS2/66",
      city: "Petaling Jaya",
      postalCode: "47300",
      state: "Selangor",
      latitude: 3.1189,
      longitude: 101.5835
    },
    campaignLocations: [
      {
        placeName: "Pusat Kebajikan Sunbeams",
        address: {
          street: "Jalan SS2/66",
          city: "Petaling Jaya",
          postalCode: "47300",
          state: "Selangor",
          latitude: 3.1189,
          longitude: 101.5835
        }
      },
      {
        placeName: "Dewan Serbaguna Taman SEA",
        address: {
          street: "Jalan SS23/15, Taman SEA",
          city: "Petaling Jaya",
          postalCode: "47400",
          state: "Selangor",
          latitude: 3.1189,
          longitude: 101.5835
        }
      },
      {
        placeName: "Pusat Komuniti Damansara Jaya",
        address: {
          street: "Jalan SS22/19, Damansara Jaya",
          city: "Petaling Jaya",
          postalCode: "47400",
          state: "Selangor",
          latitude: 3.1334,
          longitude: 101.6176
        }
      }
    ]
  }
};

// Helper functions
export function getDonorAddress(donorName: string, city: string): Address | null {
  const donorMapping = DONOR_ADDRESS_MAPPING[donorName];
  if (!donorMapping) return null;
  
  return donorMapping[city] || null;
}

export function getVolunteerAddress(ngoName: string): { officeAddress: Address; campaignLocations: CampaignLocation[] } | null {
  return VOLUNTEER_MAPPING[ngoName] || null;
}

export function getRandomCampaignLocation(ngoName: string): CampaignLocation | null {
  const volunteer = VOLUNTEER_MAPPING[ngoName];
  if (!volunteer || volunteer.campaignLocations.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * volunteer.campaignLocations.length);
  return volunteer.campaignLocations[randomIndex];
}

export function generateReceiverAddress(): Address {
  const cities = [
    'Kuala Lumpur', 'Shah Alam', 'Petaling Jaya', 'Klang', 'Subang Jaya',
    'Cheras', 'Bangsar', 'Setapak', 'Brickfields', 'Puchong',
    'Damansara', 'TTDI', 'Chow Kit', 'Taman Maluri', 'Taman Desa',
    'Taman Paramount', 'Taman SEA', 'Damansara Jaya', 'Taman Midah',
    'Taman Connaught', 'Salak South'
  ];
  
  const city = faker.helpers.arrayElement(cities);
  const state = getStateFromCity(city);
  const postalCode = generatePostalCodeForCity(city);
  
  return {
    street: generateMalaysianStreetAddress(),
    city: city,
    postalCode: postalCode,
    state: state,
    latitude: faker.location.latitude({ min: 2.5, max: 3.5 }),
    longitude: faker.location.longitude({ min: 101, max: 102 })
  };
}