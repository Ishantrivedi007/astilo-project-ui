import React from "react";
import { Chart } from "primereact/chart";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { classNames } from "primereact/utils";
import { Image } from "primereact/image";
import "./Dashboard.css";

import "primeflex/primeflex.css";
import { Grid } from "@nextui-org/react";
import { Divider } from "primereact/divider";

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
              <span className="font-semibold text-lg ml-4">Friends</span>
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

      {/* Repeat for other cards */}
    </div>
  );
};

export default Dashboard;
