// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ILeapTypes {
    struct LaunchParams {
        string name;
        string ticker;
        string description;
        string image;
        string[3] urls;
        address ltAddress;
        bytes32 salt;
    }
}
