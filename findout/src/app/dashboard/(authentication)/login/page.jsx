"use client"
import supabase from "@/utils/supabaseClient";
import React from "react";

const login = async () => {

    const [data, setData] = useState<{
        email: string,
        password: string
    }>({
        email: '',
        password: ''
    });

    try {
        let { data, error } = await supabase
            .auth
            .signInWithPassword({
                email: "someone@email.com",
                password: "password123"
            });
            if (data) {
                console.log("Login successful:", data);
            }
    } catch (error) {

    }

    return (
        <div className="pageContent">
            <div className="grid">
                <label>Email</label>
                <input 
                    type="text"
                    name="email"
                    value={data?.email}
                    onChange={handleChange}
                 />
            </div>
            <div className="grid">
                <label>Password</label>
                <input 
                    type="password"
                    name="password"
                    value={data?.password}
                    onChange={handleChange}
                 />
            </div>
            <button onClick={login}>LogIn</button>
        </div>
    )
}

export default login 