const { spawn } = require('child_process');
const fs = require('fs');
require('dotenv').config();

/**
 * Test Runner for Server-Controlled PvP System
 * Runs all tests in sequence and generates a comprehensive report
 */

class TestRunner {
    constructor() {
        this.testResults = [];
        this.startTime = Date.now();
    }

    async runCommand(command, args = [], options = {}) {
        return new Promise((resolve, reject) => {
            console.log(`🔄 Running: ${command} ${args.join(' ')}`);
            
            const childProcess = spawn(command, args, {
                stdio: 'pipe',
                env: { ...process.env }, // Pass environment variables to child process
                ...options
            });

            let stdout = '';
            let stderr = '';

            childProcess.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                console.log(output.trim());
            });

            childProcess.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                console.error(output.trim());
            });

            childProcess.on('close', (code) => {
                resolve({
                    code,
                    stdout,
                    stderr,
                    success: code === 0
                });
            });

            childProcess.on('error', (error) => {
                reject(error);
            });
        });
    }

    async runTest(testName, command, args = [], timeout = 120000) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🧪 RUNNING TEST: ${testName}`);
        console.log(`${'='.repeat(60)}\n`);
        
        const testStartTime = Date.now();
        
        try {
            // Set timeout for test
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Test timeout')), timeout);
            });
            
            const testPromise = this.runCommand(command, args);
            
            const result = await Promise.race([testPromise, timeoutPromise]);
            const duration = Date.now() - testStartTime;
            
            const testResult = {
                name: testName,
                success: result.success,
                duration,
                output: result.stdout,
                error: result.stderr,
                exitCode: result.code
            };
            
            this.testResults.push(testResult);
            
            if (result.success) {
                console.log(`\n✅ ${testName} PASSED (${duration}ms)`);
            } else {
                console.log(`\n❌ ${testName} FAILED (${duration}ms)`);
                console.log(`Exit code: ${result.code}`);
                if (result.stderr) {
                    console.log(`Error: ${result.stderr}`);
                }
            }
            
            return testResult;
            
        } catch (error) {
            const duration = Date.now() - testStartTime;
            
            const testResult = {
                name: testName,
                success: false,
                duration,
                output: '',
                error: error.message,
                exitCode: -1
            };
            
            this.testResults.push(testResult);
            
            console.log(`\n❌ ${testName} FAILED (${duration}ms)`);
            console.log(`Error: ${error.message}`);
            
            return testResult;
        }
    }

    async checkPrerequisites() {
        console.log('🔍 Checking prerequisites...\n');
        
        // Check if contract is compiled
        if (!fs.existsSync('artifacts/IrysCrushLeaderboardServerControlled.abi.json')) {
            console.log('📦 Compiling server-controlled contract...');
            const compileResult = await this.runCommand('node', ['compile-server-controlled.js']);
            
            if (!compileResult.success) {
                throw new Error('Failed to compile contract');
            }
        } else {
            console.log('✅ Contract artifacts found');
        }
        
        // Check if contract is deployed
        if (!fs.existsSync('deployment-server-controlled.json')) {
            throw new Error('Contract not deployed. Please run: node deploy-server-controlled.js');
        } else {
            const deploymentInfo = JSON.parse(fs.readFileSync('deployment-server-controlled.json', 'utf8'));
            console.log('✅ Contract deployed at:', deploymentInfo.contractAddress);
        }
        
        // Check environment variables
        const requiredEnvVars = ['PRIVATE_KEY', 'PRIVATE_KEY2', 'IRYS_RPC_URL', 'GAME_SERVER_ADDRESS'];
        
        console.log('🔍 Checking environment variables:');
        requiredEnvVars.forEach(varName => {
            const value = process.env[varName];
            if (value) {
                console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
            } else {
                console.log(`❌ ${varName}: NOT SET`);
            }
        });
        
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
        } else {
            console.log('✅ All environment variables configured');
        }
        
        console.log('✅ Prerequisites check passed\n');
    }

    generateReport() {
        const totalDuration = Date.now() - this.startTime;
        const passedTests = this.testResults.filter(t => t.success);
        const failedTests = this.testResults.filter(t => !t.success);
        
        const report = {
            summary: {
                totalTests: this.testResults.length,
                passed: passedTests.length,
                failed: failedTests.length,
                successRate: (passedTests.length / this.testResults.length * 100).toFixed(2),
                totalDuration: totalDuration,
                averageDuration: (this.testResults.reduce((sum, t) => sum + t.duration, 0) / this.testResults.length).toFixed(2)
            },
            tests: this.testResults,
            timestamp: new Date().toISOString()
        };
        
        // Save detailed report
        fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
        
        return report;
    }

    printSummary(report) {
        console.log('\n' + '='.repeat(80));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(80));
        
        console.log(`Total Tests: ${report.summary.totalTests}`);
        console.log(`Passed: ${report.summary.passed} ✅`);
        console.log(`Failed: ${report.summary.failed} ❌`);
        console.log(`Success Rate: ${report.summary.successRate}%`);
        console.log(`Total Duration: ${(report.summary.totalDuration / 1000).toFixed(2)}s`);
        console.log(`Average Test Duration: ${(report.summary.averageDuration / 1000).toFixed(2)}s`);
        
        if (report.summary.failed > 0) {
            console.log('\n❌ Failed Tests:');
            report.tests.filter(t => !t.success).forEach(test => {
                console.log(`- ${test.name}: ${test.error || 'Exit code ' + test.exitCode}`);
            });
        }
        
        console.log('\n📄 Detailed report saved to: test-report.json');
        console.log('='.repeat(80));
    }

    async runAllTests() {
        try {
            console.log('🚀 Starting Comprehensive Test Suite for Server-Controlled PvP System\n');
            
            // Check prerequisites
            await this.checkPrerequisites();
            
            // Test 1: Contract fixes verification
            await this.runTest(
                'Contract Fixes Verification',
                'node',
                ['test-contract-fixes.js'],
                180000 // 3 minutes
            );
            
            // Test 2: Server-controlled PvP system (updated with fixes)
            await this.runTest(
                'Server-Controlled PvP System (Fixed)',
                'node',
                ['test-server-controlled-pvp.js'],
                120000 // 2 minutes
            );
            
            // Test 3: Contract functionality
            await this.runTest(
                'Contract Functionality',
                'node',
                ['test-server-controlled-functionality.js'],
                180000 // 3 minutes
            );
            
            // Test 2: Server API (requires manual server start)
            console.log('\n⚠️  Note: Server API Integration test requires manual server startup');
            console.log('Please run "node server-pvp-api.js" in another terminal before running this test');
            console.log('Skipping Server API Integration test for now...\n');
            
            // Test 3: Basic server functionality (without blockchain)
            await this.runTest(
                'Server Controller Logic',
                'node',
                ['test-complete-server-system.js', 'server'],
                60000 // 1 minute
            );
            
            // Test 4: Compilation verification
            await this.runTest(
                'Contract Compilation',
                'node',
                ['compile-server-controlled.js'],
                30000 // 30 seconds
            );
            
            // Generate and display report
            const report = this.generateReport();
            this.printSummary(report);
            
            // Return overall success
            return report.summary.failed === 0;
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            return false;
        }
    }

    async runSpecificTest(testName) {
        console.log(`🎯 Running specific test: ${testName}\n`);
        
        await this.checkPrerequisites();
        
        switch (testName.toLowerCase()) {
            case 'contract':
            case 'functionality':
                await this.runTest('Contract Functionality', 'node', ['test-server-controlled-functionality.js']);
                break;
                
            case 'server':
            case 'api':
                await this.runTest('Server API Integration', 'node', ['test-server-api-integration.js']);
                break;
                
            case 'stress':
                const level = process.argv[3] || 'medium';
                await this.runTest(`Stress Test (${level})`, 'node', ['test-server-stress.js', level], 300000);
                break;
                
            case 'compile':
                await this.runTest('Contract Compilation', 'node', ['compile-server-controlled.js']);
                break;
                
            default:
                console.log('❌ Unknown test name. Available tests:');
                console.log('- contract (or functionality)');
                console.log('- server (or api)');
                console.log('- stress [light|medium|heavy|extreme]');
                console.log('- compile');
                return false;
        }
        
        const report = this.generateReport();
        this.printSummary(report);
        
        return report.summary.failed === 0;
    }
}

// Usage instructions
function printUsage() {
    console.log('🧪 Server-Controlled PvP Test Runner\n');
    console.log('Usage:');
    console.log('  node run-all-tests.js                    # Run all tests');
    console.log('  node run-all-tests.js contract           # Test contract functionality');
    console.log('  node run-all-tests.js server             # Test server API integration');
    console.log('  node run-all-tests.js stress [level]     # Run stress test (light/medium/heavy/extreme)');
    console.log('  node run-all-tests.js compile            # Test contract compilation');
    console.log('  node run-all-tests.js help               # Show this help');
    console.log('\nPrerequisites:');
    console.log('- .env file with PRIVATE_KEY, PRIVATE_KEY2, IRYS_RPC_URL, GAME_SERVER_ADDRESS');
    console.log('- Node.js dependencies installed (npm install)');
    console.log('- For server tests: server-pvp-api.js running on port 3001');
}

// Main execution
if (require.main === module) {
    const testRunner = new TestRunner();
    const command = process.argv[2];
    
    if (!command || command === 'help') {
        printUsage();
        process.exit(0);
    }
    
    let testPromise;
    
    if (command === 'all' || !command) {
        testPromise = testRunner.runAllTests();
    } else {
        testPromise = testRunner.runSpecificTest(command);
    }
    
    testPromise
        .then((success) => {
            if (success) {
                console.log('\n🎉 All tests completed successfully!');
                process.exit(0);
            } else {
                console.log('\n❌ Some tests failed!');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('❌ Test runner error:', error);
            process.exit(1);
        });
}

module.exports = TestRunner;