import { Avatar, Grid } from "@nextui-org/react";

const UserAvatar = ({ src, css }) => {
  return (
    <Grid.Container gap={2}>
      <Grid>
        <Avatar src={src} css={css} />
      </Grid>
    </Grid.Container>
  );
};

export default UserAvatar;
