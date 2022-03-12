import React from "react";

import Avatar from "@mui/material/Avatar";

import cx from "clsx";

import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";

import { FlexRow, Item } from "@mui-treasury/component-flex";
// import { FlexCol, Flex } from "@mui-treasury/component-flex"

const usePersonStyles = makeStyles(() => ({
  text: {
    fontFamily: "Barlow, san-serif",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflow: "hidden",
  },
  name: {
    fontWeight: 600,
    fontSize: "1rem",
    color: "#122740",
  },
  caption: {
    fontSize: "0.8rem",
    color: "#758392",
    marginTop: -4,
  },
  btn: {
    borderRadius: 20,
    padding: "0.125rem 0.75rem",
    borderColor: "#becddc",
    fontSize: "0.75rem",
  },
}));

const Person = ({ contact, setOneContact }) => {
  var avatar = "";
  if (
    contact.contact.portrait !== null &&
    contact.contact.portrait !== undefined
  ) {
    avatar = contact.contact.portrait.data.toString("base64");
  }

  const styles = usePersonStyles();
  return (
    <FlexRow gap={2} p={2.5}>
      <Item>
        <Avatar src={"data:image/png;base64," + avatar} />
      </Item>
      <FlexRow wrap="true" grow gap={0.5} minWidth={0}>
        <Item
          grow
          minWidth={0}
          gap={0.5}
          textAlign="center"
          position={"middle"}
          sx={{
            display: "flex",
            alignItems: "center",
            flexDirection: "column",
          }}
        >
          <div className={cx(styles.name, styles.text)}>
            <div
              style={{
                overflow: "hidden",
                  textOverflow: "ellipsis",
                  width: "8rem",
              }}
            >
              {contact.contact.firstName + " " + contact.contact.lastName}
            </div>
          </div>
          <div className={cx(styles.caption, styles.text)}>
            <div
              style={{
                overflow: "hidden",
                  textOverflow: "ellipsis",
                  width: "8rem",
              }}
            >
              
              {"Job: " + contact.contact.occupation}
            </div>
          </div>
        </Item>
        <Item position={"right"}>
          <Button
            className={styles.btn}
            variant={"outlined"}
            id="detail"
            onClick={() => {
              setOneContact({ ...contact.contact, selected: true });
            }}
          >
            Detail
          </Button>
        </Item>
      </FlexRow>
    </FlexRow>
  );
};

export default Person;
