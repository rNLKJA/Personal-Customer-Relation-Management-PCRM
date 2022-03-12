
    const LogoutUser = async () => {
        
            
        localStorage.removeItem('jwt')
                 
        window.location.href = "/login"
    }    

    export default LogoutUser;


