import {createTheme, Theme} from "@mui/material";

export const lightTheme = (): Theme => {
    const theme = createTheme({
        components: {
            MuiButtonBase: {
                defaultProps: {
                    disableRipple: true,
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: ({ ownerState }) => ({
                        ...(ownerState.variant === 'contained' &&
                            ownerState.color === 'primary' && {
                                backgroundColor: '#F97F51',
                                color: '#fff',
                                '&:hover': {
                                    backgroundColor: '#4834d4',
                                },
                            }),
                    }),
                },
            },
        },
    })

    return theme

}