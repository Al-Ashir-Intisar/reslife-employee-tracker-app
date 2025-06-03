"use client"
import supabase from "@/utils/supabaseClient";
import React, { useState } from "react";

const Login = () => {
    const [data, setData] = useState({
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleLogin = async () => {
        try {
            const { data: session, error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password
            });
            if (session) {
                console.log("Login successful:", session);
            }
            if (error) {
                console.error(error);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="pageContent">
            <div className="grid">
                <label>Email</label>
                <input
                    type="text"
                    name="email"
                    value={data.email}
                    onChange={handleChange}
                />
            </div>
            <div className="grid">
                <label>Password</label>
                <input
                    type="password"
                    name="password"
                    value={data.password}
                    onChange={handleChange}
                />
            </div>
            <button onClick={handleLogin}>LogIn</button>
        </div>
    );
};

export default Login;
