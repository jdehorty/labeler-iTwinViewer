import {BlockText, Button, ButtonType} from "@bentley/ui-core";
import React from "react";

import styles from "./styles/Header.module.scss";

interface HeaderProps {
    handleLogin: () => void;
    handleLogout: () => void;
    loggedIn: boolean;
}

export const Header = (props: HeaderProps) => {
    const {loggedIn, handleLogin, handleLogout,} = props;
    const {button, text, buttonContainer, header} = styles;

    return (
        <header className={header}>
            <table>
                <tbody>
                    <tr>
                        <td>
                            <div className={buttonContainer}>
                                <Button className={button} onClick={handleLogin} buttonType={ButtonType.Primary}
                                        disabled={loggedIn}>
                                    {"Sign In"}
                                </Button>
                                <Button className={button} onClick={handleLogout} buttonType={ButtonType.Primary}
                                        disabled={!loggedIn}>
                                    {"Sign Out"}
                                </Button>
                            </div>
                        </td>
                        <td>
                            <div>
                                <BlockText
                                    className={text}
                                >
                                    {"ML Labeler"}
                                </BlockText>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </header>
    );
};


