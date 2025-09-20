class MathService {
    constructor() {}
    
    public async add(a: number, b: number): Promise<number> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(a + b);
            }, 1000);
        });
    }
    public async subtract(a: number, b: number): Promise<number> {
        return new Promise((resolve, reject) => {
            setTimeout(() => { 
                resolve(a - b);
            }, 1000);
        });
    }
    public async multiply(a: number, b: number): Promise<number> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(a * b);
            }, 1000);
        });
    }
    public async divide(a: number, b: number): Promise<number> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(a / b);
            }, 1000);
        });
    }
}

export default MathService;

export const mathService = new MathService();