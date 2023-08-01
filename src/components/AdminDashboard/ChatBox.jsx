import React, { useState } from "react";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import { ScrollPanel } from "primereact/scrollpanel";
import "./ChatBox.css";

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeUser, setActiveUser] = useState("User 1");

  const sendMessage = () => {
    if (newMessage.trim() !== "") {
      setMessages([...messages, { user: activeUser, text: newMessage }]);
      setNewMessage("");
    }
  };

  const users = [
    {
      name: "User 1",
      image:
        "https://example.com/user1.jpghttps://primefaces.org/cdn/primereact/images/avatar/elwinsharvill.png",
    },
    {
      name: "User 2",
      image:
        "https://example.com/user1.jpghttps://primefaces.org/cdn/primereact/images/avatar/elwinsharvill.png",
    },
    {
      name: "User 3",
      image:
        "https://example.com/user1.jpghttps://primefaces.org/cdn/primereact/images/avatar/elwinsharvill.png",
    },
    {
      name: "User 4",
      image:
        "https://primefaces.org/cdn/primereact/images/avatar/elwinsharvill.png",
    },
    {
      name: "User 5",
      image: "./test.png",
    },
  ];

  return (
    <Card className="chat-card">
      <div className="users">
        {users.map((user) => (
          <Button
            key={user.name}
            className={`p-button-text ${
              activeUser === user.name ? "active-user" : ""
            }`}
            label={user.name}
            icon={`user-icon ${user.name === activeUser ? "pi pi-user" : ""}`}
            onClick={() => setActiveUser(user.name)}
          />
        ))}
      </div>
      <Divider />
      <div className="chat-messages">
        <ScrollPanel style={{ height: "300px" }}>
          {messages.map((message, index) => (
            <div
              key={index}
              className={`message ${
                message.user === activeUser ? "self" : "other"
              }`}
            >
              <div className="user-image">
                <img src={`./test.png`} alt={message.user} />
              </div>
              <div className="message-content">
                <span className="username">{message.user}</span>
                <div className="text">{message.text}</div>
              </div>
            </div>
          ))}
        </ScrollPanel>
      </div>
      <div className="chat-input">
        <InputText
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <Button
          className="p-button-raised p-button-rounded"
          label="Send"
          onClick={sendMessage}
        />
      </div>
    </Card>
  );
};

export default Chat;
