import React, { useState } from "react";
import { Dropdown } from "primereact/dropdown";

const SharedDropDown = () => {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const countries = [
    { name: "Australia", code: "AU", flagUrl: "https://flagcdn.com/au.svg" },
    { name: "Brazil", code: "BR", flagUrl: "https://flagcdn.com/br.svg" },
    { name: "China", code: "CN", flagUrl: "https://flagcdn.com/cn.svg" },
    { name: "Egypt", code: "EG", flagUrl: "https://flagcdn.com/eg.svg" },
    { name: "France", code: "FR", flagUrl: "https://flagcdn.com/fr.svg" },
    { name: "Germany", code: "DE", flagUrl: "https://flagcdn.com/de.svg" },
    { name: "India", code: "IN", flagUrl: "https://flagcdn.com/in.svg" },
    { name: "Japan", code: "JP", flagUrl: "https://flagcdn.com/jp.svg" },
    { name: "Spain", code: "ES", flagUrl: "https://flagcdn.com/es.svg" },
    {
      name: "United States",
      code: "US",
      flagUrl: "https://flagcdn.com/us.svg",
    },
  ];

  const selectedCountryTemplate = (option, props) => {
    if (option) {
      return (
        <div className="flex align-items-center">
          <img
            alt={option.name}
            src={option.flagUrl}
            className={`mr-2 flag flag-${option.code.toLowerCase()}`}
            style={{ width: "25px" }}
          />
          <div>{option.name}</div>
        </div>
      );
    }

    return <span>{props.placeholder}</span>;
  };

  const countryOptionTemplate = (option) => {
    return (
      <div className="flex align-items-center">
        <img
          alt={option.name}
          src={option.flagUrl}
          className={`mr-2 flag flag-${option.code.toLowerCase()}`}
          style={{ width: "25px" }}
        />
        <div>{option.name}</div>
      </div>
    );
  };

  return (
    // <div className="card flex justify-content-center">
    <Dropdown
      value={selectedCountry}
      onChange={(e) => setSelectedCountry(e.value)}
      options={countries}
      optionLabel="name"
      placeholder="Select a Country"
      filter
      valueTemplate={selectedCountryTemplate}
      itemTemplate={countryOptionTemplate}
      style={{ borderRadius: "30px !important" }}
      className="w-full md:w-14rem border rounded rounded-xl"
    />
    //   </div>
  );
};

export default SharedDropDown;
