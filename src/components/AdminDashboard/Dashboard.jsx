import React, { useEffect, useState } from "react";
import { Chart } from "primereact/chart";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { classNames } from "primereact/utils";
import { Image } from "primereact/image";
import "./Dashboard.css";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Paginator } from "primereact/paginator";

import "primeflex/primeflex.css";
import { Grid } from "@nextui-org/react";
import { Divider } from "primereact/divider";
import { TriStateCheckbox } from "primereact/tristatecheckbox";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";
import { Tag } from "primereact/tag";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import { Timeline } from "primereact/timeline";
import { DataView } from "primereact/dataview";
import { Rating } from "primereact/rating";
import { Calendar } from "primereact/calendar";
import TodoList from "./TodoList";
import Chat from "./ChatBox";

const sampleData = [
  {
    id: 1000,
    name: "James Butt",
    country: {
      name: "Algeria",
      code: "dz",
    },
    company: "Benton, John B Jr",
    date: "2015-09-13",
    status: "unqualified",
    verified: true,
    activity: 17,
    representative: {
      name: "Ioni Bowcher",
      image: "ionibowcher.png",
    },
    balance: 70663,
  },
  {
    id: 1001,
    name: "John Doe",
    country: {
      name: "USA",
      code: "us",
    },
    company: "ABC Corporation",
    date: "2022-07-25",
    status: "qualified",
    verified: false,
    activity: 12,
    representative: {
      name: "Amy Elsner",
      image: "amyelsner.png",
    },
    balance: 12000,
  },
  {
    id: 1002,
    name: "Jane Smith",
    country: {
      name: "Canada",
      code: "ca",
    },
    company: "Smith Industries",
    date: "2023-01-10",
    status: "negotiation",
    verified: true,
    activity: 25,
    representative: {
      name: "Asiya Javayant",
      image: "asiyajavayant.png",
    },
    balance: 45000,
  },
  {
    id: 1003,
    name: "Michael Johnson",
    country: {
      name: "Australia",
      code: "au",
    },
    company: "Johnson Ltd",
    date: "2021-11-05",
    status: "renewal",
    verified: false,
    activity: 8,
    representative: {
      name: "Stephen Shaw",
      image: "stephenshaw.png",
    },
    balance: 98000,
  },
  {
    id: 1004,
    name: "Linda Williams",
    country: {
      name: "United Kingdom",
      code: "gb",
    },
    company: "Williams Co",
    date: "2023-03-18",
    status: "new",
    verified: true,
    activity: 30,
    representative: {
      name: "Bernardo Dominic",
      image: "bernardodominic.png",
    },
    balance: 55000,
  },
];

const lineChartData = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May"],
  datasets: [
    {
      label: "Sales",
      data: [12, 19, 3, 5, 2],
      borderColor: "#42A5F5",
      backgroundColor: "rgba(66, 165, 245, 0.2)",
    },
  ],
};

const barChartData = {
  labels: ["Product 1", "Product 2", "Product 3", "Product 4"],
  datasets: [
    {
      label: "Sales",
      data: [65, 59, 80, 81],
      backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#FF9F40"],
    },
  ],
};

const pieChartData = {
  labels: ["Category A", "Category B", "Category C"],
  datasets: [
    {
      data: [300, 50, 100],
      backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56"],
      hoverBackgroundColor: ["#FF6384", "#36A2EB", "#FFCE56"],
    },
  ],
};

const doughnutChartData = {
  labels: ["Category X", "Category Y", "Category Z"],
  datasets: [
    {
      data: [120, 150, 180],
      backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56"],
      hoverBackgroundColor: ["#FF6384", "#36A2EB", "#FFCE56"],
    },
  ],
};

const Dashboard = () => {
  const [first, setFirst] = useState(0);
  const itemsPerPage = 5;

  const onPageChange = (event) => {
    setFirst(event.first);
  };
  const [customers, setCustomers] = useState(null);
  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    "country.name": { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    representative: { value: null, matchMode: FilterMatchMode.IN },
    status: { value: null, matchMode: FilterMatchMode.EQUALS },
    verified: { value: null, matchMode: FilterMatchMode.EQUALS },
  });
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [representatives] = useState([
    { name: "Amy Elsner", image: "amyelsner.png" },
    { name: "Anna Fali", image: "annafali.png" },
    { name: "Asiya Javayant", image: "asiyajavayant.png" },
    { name: "Bernardo Dominic", image: "bernardodominic.png" },
    { name: "Elwin Sharvill", image: "elwinsharvill.png" },
    { name: "Ioni Bowcher", image: "ionibowcher.png" },
    { name: "Ivan Magalhaes", image: "ivanmagalhaes.png" },
    { name: "Onyama Limba", image: "onyamalimba.png" },
    { name: "Stephen Shaw", image: "stephenshaw.png" },
    { name: "XuXue Feng", image: "xuxuefeng.png" },
  ]);
  const [statuses] = useState([
    "unqualified",
    "qualified",
    "new",
    "negotiation",
    "renewal",
  ]);

  const getSeverity = (status) => {
    switch (status) {
      case "unqualified":
        return "danger";

      case "qualified":
        return "success";

      case "new":
        return "info";

      case "negotiation":
        return "warning";

      case "renewal":
        return null;
    }
  };

  //   useEffect(() => {
  //     CustomerService.getCustomersMedium().then((data) => {
  //       setCustomers(getCustomers(data));
  //       setLoading(false);
  //     });
  //   }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setCustomers(getCustomers(sampleData));
    setLoading(false);
  }, []);
  const getCustomers = (data) => {
    return [...(data || [])].map((d) => {
      d.date = new Date(d.date);

      return d;
    });
  };

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    let _filters = { ...filters };

    _filters["global"].value = value;

    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const renderHeader = () => {
    return (
      <div className="flex justify-content-end">
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder="Keyword Search"
          />
        </span>
      </div>
    );
  };

  const countryBodyTemplate = (rowData) => {
    return (
      <div className="flex align-items-center gap-2">
        <img
          alt="flag"
          src="https://primefaces.org/cdn/primereact/images/flag/flag_placeholder.png"
          className={`flag flag-${rowData.country.code}`}
          style={{ width: "24px" }}
        />
        <span>{rowData.country.name}</span>
      </div>
    );
  };

  const representativeBodyTemplate = (rowData) => {
    const representative = rowData.representative;

    return (
      <div className="flex align-items-center gap-2">
        <img
          alt={representative.name}
          src={`https://primefaces.org/cdn/primereact/images/avatar/${representative.image}`}
          width="32"
        />
        <span>{representative.name}</span>
      </div>
    );
  };

  const representativesItemTemplate = (option) => {
    return (
      <div className="flex align-items-center gap-2">
        <img
          alt={option.name}
          src={`https://primefaces.org/cdn/primereact/images/avatar/${option.image}`}
          width="32"
        />
        <span>{option.name}</span>
      </div>
    );
  };

  const statusBodyTemplate = (rowData) => {
    return (
      <Tag value={rowData.status} severity={getSeverity(rowData.status)} />
    );
  };

  const statusItemTemplate = (option) => {
    return <Tag value={option} severity={getSeverity(option)} />;
  };

  const verifiedBodyTemplate = (rowData) => {
    return (
      <i
        className={classNames("pi", {
          "true-icon pi-check-circle": rowData.verified,
          "false-icon pi-times-circle": !rowData.verified,
        })}
      ></i>
    );
  };

  const representativeRowFilterTemplate = (options) => {
    return (
      <MultiSelect
        value={options.value}
        options={representatives}
        itemTemplate={representativesItemTemplate}
        onChange={(e) => options.filterApplyCallback(e.value)}
        optionLabel="name"
        placeholder="Any"
        className="p-column-filter"
        maxSelectedLabels={1}
        style={{ minWidth: "14rem" }}
      />
    );
  };

  const statusRowFilterTemplate = (options) => {
    return (
      <Dropdown
        value={options.value}
        options={statuses}
        onChange={(e) => options.filterApplyCallback(e.value)}
        itemTemplate={statusItemTemplate}
        placeholder="Select One"
        className="p-column-filter"
        showClear
        style={{ minWidth: "12rem" }}
      />
    );
  };

  const verifiedRowFilterTemplate = (options) => {
    return (
      <TriStateCheckbox
        value={options.value}
        onChange={(e) => options.filterApplyCallback(e.value)}
      />
    );
  };

  const header = renderHeader();
  const timelineData = [
    {
      date: "2023-07-01",
      title: "Meeting with Client",
      description: "Discuss project requirements",
      color: "blue",
    },
    {
      date: "2023-07-07",
      title: "Project Kickoff",
      description: "Start development",
      color: "green",
    },
    {
      date: "2023-07-15",
      title: "Milestone 1",
      description: "Complete Phase 1 of the project",
      color: "orange",
    },
    {
      date: "2023-07-25",
      title: "Milestone 2",
      description: "Complete Phase 2 of the project",
      color: "orange",
    },
    {
      date: "2023-08-01",
      title: "Final Delivery",
      description: "Hand over the project to the client",
      color: "red",
    },
  ];
  const productData = [
    {
      id: 1,
      name: "Product A",
      price: "$50",
      rating: 4,
      image: "https://source.unsplash.com/random/200x200/?product",
    },
    {
      id: 2,
      name: "Product B",
      price: "$30",
      rating: 3.5,
      image: "https://source.unsplash.com/random/200x200/?product",
    },
    {
      id: 3,
      name: "Product C",
      price: "$80",
      rating: 5,
      image: "https://source.unsplash.com/random/200x200/?product",
    },
    // Add more products here
  ];

  const itemTemplate = (product) => {
    const percentageRating = (product.rating / 5) * 100;
    return (
      <React.Fragment>
        <li className="product-item">
          <div className="product-image-container">
            <Image src={product.image} alt={product.name} />
          </div>
          <div className="product-info">
            <div className="product-name">{product.name}</div>
            <div className="product-price">{product.price}</div>
            <div className="product-rating">
              <div className="product-rating-stars">
                <Rating
                  value={percentageRating}
                  readOnly
                  stars={5}
                  cancel={false}
                  className="custom-rating-stars"
                />
              </div>
              <div className="product-rating-value">{product.rating}</div>
            </div>
          </div>
        </li>
      </React.Fragment>
    );
  };

  return (
    <div className="dashboard">
      <Grid.Container justify="space-evenly">
        <Card className="stats-card p-shadow-4" style={{ display: "flex" }}>
          <Grid container direction="row" style={{ display: "flex " }}>
            <Grid>
              <span className="font-semibold text-lg">Sales</span>
              <div className="text-4xl font-bold text-900 mr-4">120</div>
              <div className="text-green-500">
                <span className="font-medium">+12%</span>
                <i className="pi pi-arrow-up text-xs ml-2" />
              </div>
            </Grid>
            <Grid>
              <Image
                src="/profit.svg"
                alt="chart"
                height="100px"
                width="250px"
              />
            </Grid>
          </Grid>
          <div className="p-grid p-nogutter">
            <div className="p-col-12 mt-3">
              <Button
                label="View Details"
                icon="pi pi-arrow-right"
                className="p-button-secondary p-button-rounded"
              />
            </div>
          </div>
        </Card>
        <Card className="stats-card p-shadow-4" style={{ display: "flex" }}>
          <Grid container direction="row" style={{ display: "flex " }}>
            <Grid>
              <span className="font-semibold text-lg">Revenue</span>
              <div className="text-4xl font-bold text-900 mr-4">$450</div>
              <div className="text-green-500">
                <span className="font-medium">+20%</span>
                <i className="pi pi-arrow-up text-xs ml-2" />
              </div>
            </Grid>
            <Grid>
              <Image
                src="/increasedProfit.svg"
                alt="chart"
                height="100px"
                width="250px"
              />
            </Grid>
          </Grid>
          <div className="p-grid p-nogutter">
            <div className="p-col-12 mt-3">
              <Button
                label="View Details"
                icon="pi pi-arrow-right"
                className="p-button-secondary p-button-rounded"
              />
            </div>
          </div>
        </Card>
        <Card className="stats-card p-shadow-4" style={{ display: "flex" }}>
          <Grid container direction="row" style={{ display: "flex " }}>
            <Grid>
              <span className="font-semibold text-lg">Visitors</span>
              <div className="text-4xl font-bold text-900 mr-4">360</div>
              {/* <div className="text-red-500" style={{ color: "#ec4899" }}> */}
              <div style={{ color: "#ec4899" }}>
                <span className="font-medium">-24%</span>
                <i className="pi pi-arrow-down text-xs ml-2" />
              </div>
            </Grid>
            <Grid>
              <Image src="/loss.svg" alt="chart" height="100px" width="250px" />
            </Grid>
          </Grid>
          <div className="p-grid p-nogutter">
            <div className="p-col-12 mt-3">
              <Button
                label="View Details"
                icon="pi pi-arrow-right"
                className="p-button-secondary p-button-rounded"
              />
            </div>
          </div>
        </Card>
        <Card className="stats-card p-shadow-4" style={{ display: "flex" }}>
          <Grid container direction="row" style={{ display: "flex " }}>
            <Grid>
              <span className="font-semibold text-lg">Stock</span>
              <div className="text-4xl font-bold text-900 mr-4">164</div>
              <div className="text-green-500">
                <span className="font-medium">+30%</span>
                <i className="pi pi-arrow-up text-xs ml-2" />
              </div>
            </Grid>
            <Grid>
              <Image
                src="/mediumProfit.svg"
                alt="chart"
                height="100px"
                width="250px"
              />
            </Grid>
          </Grid>
          <div className="p-grid p-nogutter">
            <div className="p-col-12 mt-3">
              <Button
                label="View Details"
                icon="pi pi-arrow-right"
                className="p-button-secondary p-button-rounded"
              />
            </div>
          </div>
        </Card>
      </Grid.Container>
      <Card
        className="bar-chart p-shadow-4"
        style={{
          background: "#ffffff",
          border: "1px solid #dfe7ef",
          padding: "2rem",
          marginBottom: "2rem",
          boxShadow: "0px 4px 30px rgba(221,224,255,.54)",
          borderRadius: "12px",
        }}
      >
        <h2>Line Chart</h2>
        <Chart type="line" data={lineChartData} />
      </Card>

      <Card
        className="bar-chart p-shadow-4"
        style={{
          background: "#ffffff",
          border: "1px solid #dfe7ef",
          padding: "2rem",
          marginBottom: "2rem",
          boxShadow: "0px 4px 30px rgba(221,224,255,.54)",
          borderRadius: "12px",
        }}
      >
        <h2>Bar Chart</h2>
        <Chart type="bar" data={barChartData} />
      </Card>

      <Card
        className="chart-card p-shadow-4"
        style={{
          background: "#ffffff",
          border: "1px solid #dfe7ef",
          padding: "2rem",
          marginBottom: "2rem",
          boxShadow: "0px 4px 30px rgba(221,224,255,.54)",
          borderRadius: "12px",
        }}
      >
        <h2>Pie Chart</h2>
        <Chart type="pie" data={pieChartData} />
      </Card>

      <Card
        className="chart-card p-shadow-4"
        style={{
          background: "#ffffff",
          border: "1px solid #dfe7ef",
          padding: "2rem",
          marginBottom: "2rem",
          boxShadow: "0px 4px 30px rgba(221,224,255,.54)",
          borderRadius: "12px",
        }}
      >
        <h2>Doughnut Chart</h2>
        <Chart type="doughnut" data={doughnutChartData} />
      </Card>
      <Grid.Container xs={12} justify="space-evenly">
        <Card
          className="share-card p-shadow-4 !h-[225px]"
          style={{ display: "flex" }}
        >
          <Grid container direction="row" style={{ display: "flex " }}>
            <Grid
              style={{
                //background: "#5f7ab5",
                border: "1px solid #dfe7ef",

                position: "relative", // Set position to relative for the background image
              }}
            >
              <Image
                className="fb-logo"
                src="/fb.svg"
                alt="fb"
                width="100%"
                style={{
                  background: "#5f7ab5",
                  height: "50%",
                  position: "relative",
                }} // Set position to relative for the background image
              />
              <Image
                src="/facebook.svg"
                alt="Facebook"
                height="50px"
                width="50px"
                style={{
                  position: "absolute", // Set position to absolute for the foreground image
                  top: "50%", // Vertically center the image
                  left: "50%", // Horizontally center the image
                  transform: "translate(-50%, -50%)", // Center the image precisely
                  zIndex: 1, // Set the zIndex to 1 to make sure it appears on top
                }}
              />{" "}
            </Grid>
          </Grid>
          <Grid.Container direction="row" xs={12} style={{ display: "flex" }}>
            <Grid xs={5} direction="column" alignItems="center">
              <div className="text-4xl font-bold text-900 ml-5">89K</div>
              <span className="font-semibold text-lg ml-5">Friends</span>
            </Grid>
            <Grid
              xs={2}
              direction="column"
              alignItems="center"
              style={{ display: "flex" }}
            >
              <div
                style={{
                  height: "100%",
                  borderRight: "1px solid #dcdcdc",
                  margin: "0 10px",
                }}
              ></div>
            </Grid>
            <Grid xs={5} direction="column" alignItems="center">
              <div className="text-4xl font-bold text-900 mr-5">8,665</div>
              <span className="font-semibold text-lg mr-5">Feeds</span>
            </Grid>
          </Grid.Container>
        </Card>
        <Card
          className="share-card p-shadow-4 !h-[225px]"
          style={{ display: "flex" }}
        >
          <Grid container direction="row" style={{ display: "flex " }}>
            <Grid
              style={{
                //background: "#5f7ab5",
                border: "1px solid #dfe7ef",

                position: "relative", // Set position to relative for the background image
              }}
            >
              <Image
                className="fb-logo"
                src="/insta.svg"
                alt="insta"
                width="100%"
                style={{
                  background: "#5f7ab5",
                  height: "50%",
                  position: "relative",
                }} // Set position to relative for the background image
              />
              <Image
                src="/instagram.svg"
                alt="Instagram"
                height="50px"
                width="50px"
                style={{
                  position: "absolute", // Set position to absolute for the foreground image
                  top: "50%", // Vertically center the image
                  left: "50%", // Horizontally center the image
                  transform: "translate(-50%, -50%)", // Center the image precisely
                  zIndex: 1, // Set the zIndex to 1 to make sure it appears on top
                }}
              />{" "}
            </Grid>
          </Grid>
          <Grid.Container direction="row" xs={12} style={{ display: "flex" }}>
            <Grid xs={5} direction="column" alignItems="center">
              <div className="text-4xl font-bold text-900 ml-5">79K</div>
              <span className="font-semibold text-lg ml-5">Followers</span>
            </Grid>
            <Grid
              xs={2}
              direction="column"
              alignItems="center"
              style={{ display: "flex" }}
            >
              <div
                style={{
                  height: "100%",
                  borderRight: "1px solid #dcdcdc",
                  margin: "0 10px",
                }}
              ></div>
            </Grid>
            <Grid xs={5} direction="column" alignItems="center">
              <div className="text-4xl font-bold text-900 mr-5">8,665</div>
              <span className="font-semibold text-lg mr-5">Feeds</span>
            </Grid>
          </Grid.Container>
        </Card>

        <Card
          className="share-card p-shadow-4 !h-[225px]"
          style={{ display: "flex" }}
        >
          <Grid container direction="row" style={{ display: "flex " }}>
            <Grid
              style={{
                //background: "#5f7ab5",
                border: "1px solid #dfe7ef",

                position: "relative", // Set position to relative for the background image
              }}
            >
              <Image
                className="fb-logo"
                src="/link.svg"
                alt="link"
                width="100%"
                style={{
                  background: "#5f7ab5",
                  height: "50%",
                  position: "relative",
                }} // Set position to relative for the background image
              />
              <Image
                src="/linkedin.svg"
                alt="Linkedin"
                height="50px"
                width="50px"
                style={{
                  position: "absolute", // Set position to absolute for the foreground image
                  top: "50%", // Vertically center the image
                  left: "50%", // Horizontally center the image
                  transform: "translate(-50%, -50%)", // Center the image precisely
                  zIndex: 1, // Set the zIndex to 1 to make sure it appears on top
                }}
              />{" "}
            </Grid>
          </Grid>
          <Grid.Container direction="row" xs={12} style={{ display: "flex" }}>
            <Grid xs={5} direction="column" alignItems="center">
              <div className="text-4xl font-bold text-900 ml-5">89K</div>
              <span className="font-semibold text-lg ml-5">Contacts</span>
            </Grid>
            <Grid
              xs={2}
              direction="column"
              alignItems="center"
              style={{ display: "flex" }}
            >
              <div
                style={{
                  height: "100%",
                  borderRight: "1px solid #dcdcdc",
                  margin: "0 10px",
                }}
              ></div>
            </Grid>
            <Grid xs={5} direction="column" alignItems="center">
              <div className="text-4xl font-bold text-900 mr-5">1,292</div>
              <span className="font-semibold text-lg mr-5">Feeds</span>
            </Grid>
          </Grid.Container>
        </Card>
        <Card
          className="share-card p-shadow-4 !h-[225px]"
          style={{ display: "flex" }}
        >
          <Grid container direction="row" style={{ display: "flex " }}>
            <Grid
              style={{
                //background: "#5f7ab5",
                border: "1px solid #dfe7ef",

                position: "relative", // Set position to relative for the background image
              }}
            >
              <Image
                className="fb-logo"
                src="/yt.svg"
                alt="yt"
                width="100%"
                style={{
                  background: "#5f7ab5",
                  height: "50%",
                  position: "relative",
                }} // Set position to relative for the background image
              />
              <Image
                src="/youtube.svg"
                alt="Youtube"
                height="50px"
                width="50px"
                style={{
                  position: "absolute", // Set position to absolute for the foreground image
                  top: "50%", // Vertically center the image
                  left: "50%", // Horizontally center the image
                  transform: "translate(-50%, -50%)", // Center the image precisely
                  zIndex: 1, // Set the zIndex to 1 to make sure it appears on top
                }}
              />{" "}
            </Grid>
          </Grid>
          <Grid.Container direction="row" xs={12} style={{ display: "flex" }}>
            <Grid xs={5} direction="column" alignItems="center">
              <div className="text-4xl font-bold text-900 ml-5">1.2M</div>
              <span className="font-semibold text-lg ml-5">Followers</span>
            </Grid>
            <Grid
              xs={2}
              direction="column"
              alignItems="center"
              style={{ display: "flex" }}
            >
              <div
                style={{
                  height: "100%",
                  borderRight: "1px solid #dcdcdc",
                  margin: "0 10px",
                }}
              ></div>
            </Grid>
            <Grid xs={5} direction="column" alignItems="center">
              <div className="text-4xl font-bold text-900 mr-5">12M</div>
              <span className="font-semibold text-lg mr-5">Views</span>
            </Grid>
          </Grid.Container>
        </Card>
      </Grid.Container>
      <Card className="p-shadow-4 !border !rounded-xl">
        <DataTable
          className="prime-table !border !rounded-xl"
          style={{ borderRadius: "20px" }}
          value={customers}
          paginator
          rows={10}
          dataKey="id"
          filters={filters}
          filterDisplay="row"
          loading={loading}
          globalFilterFields={[
            "name",
            "country.name",
            "representative.name",
            "status",
          ]}
          header={renderHeader()}
          emptyMessage="No customers found."
        >
          <Column
            field="name"
            header={
              <div
                style={{
                  borderRadius: "8px",
                  padding: "8px",
                }}
              >
                Name
              </div>
            }
            filter
            filterPlaceholder="Search by name"
            style={{ minWidth: "12rem" }}
          />
          <Column
            header={
              <div
                style={{
                  borderRadius: "8px",
                  padding: "8px",
                }}
              >
                Country
              </div>
            }
            filterField="country.name"
            style={{ minWidth: "12rem" }}
            body={countryBodyTemplate}
            filter
            filterPlaceholder="Search by country"
          />
          <Column
            header={
              <div
                style={{
                  borderRadius: "8px",
                  padding: "8px",
                }}
              >
                Agent
              </div>
            }
            filterField="representative"
            showFilterMenu={false}
            filterMenuStyle={{ width: "14rem" }}
            style={{ minWidth: "14rem" }}
            body={representativeBodyTemplate}
            filter
            filterElement={representativeRowFilterTemplate}
          />
          <Column
            field="status"
            header={
              <div
                style={{
                  borderRadius: "8px",
                  padding: "8px",
                }}
              >
                Status
              </div>
            }
            showFilterMenu={false}
            filterMenuStyle={{ width: "14rem" }}
            style={{ minWidth: "12rem" }}
            body={statusBodyTemplate}
            filter
            filterElement={statusRowFilterTemplate}
          />
          <Column
            field="verified"
            header={
              <div
                style={{
                  borderRadius: "8px",
                  padding: "8px",
                }}
              >
                Verified
              </div>
            }
            dataType="boolean"
            style={{ minWidth: "6rem" }}
            body={verifiedBodyTemplate}
            filter
            filterElement={verifiedRowFilterTemplate}
          />
        </DataTable>
      </Card>
      <div className="p-col-12 p-md-6">
        {/* Your Timeline component */}
        <Card className="!border !rounded-xl">
          <h2 className="!p-text-center !mb-5 !font-bold">Daily Timeline</h2>
          <Timeline
            className="timeline"
            value={timelineData}
            align="alternate"
            content={(item) => item.title}
          />
        </Card>
      </div>
      <Card className="product-list-card p-shadow-4 rounded-xl">
        <h2 className="product-list-title font-bold">Product List</h2>
        <ul className="product-list">
          {productData.map((product) => (
            <React.Fragment key={product.id}>
              {itemTemplate(product)}
            </React.Fragment>
          ))}
        </ul>
      </Card>

      <Card className="calendar-card p-shadow-4 rounded-xl">
        <h2 className="calendar-title">Calendar</h2>
        <Grid className="border rounded-xl">
          <Calendar className="custom-calendar" inline />
        </Grid>
      </Card>

      <TodoList />
      <Chat />

      {/* Repeat for other cards */}
    </div>
  );
};

export default Dashboard;
