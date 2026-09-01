import {Button, ButtonProps} from '@mui/material';
import {createLink, LinkComponent} from '@tanstack/react-router';
import {forwardRef} from 'react';

// MUI's polymorphic `component` prop drops the router generics that type `to`/`params`.
const AnchorButton = forwardRef<
  HTMLAnchorElement,
  Omit<ButtonProps<'a'>, 'href'>
>((props, ref) => <Button ref={ref} component="a" {...props} />);

const CreatedButtonLink = createLink(AnchorButton);

const ButtonLink: LinkComponent<typeof AnchorButton> = props => (
  <CreatedButtonLink {...props} />
);

export default ButtonLink;
