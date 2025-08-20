#!/usr/bin/env python3
"""
Script to build the Rust binary for Codex
"""

import os
from scrapybara import Scrapybara

def build_codex_rust(ubuntu):
    """Build the Rust binary for Codex"""
    
    try:
        print(f"\n🔨 Building Codex Rust binary on instance: {ubuntu.id}")
        
        # Check if Rust is installed
        print("   - Checking Rust installation...")
        rust_check = ubuntu.bash(command="which rustc && which cargo && rustc --version && cargo --version")
        print(f"   - Rust check result: {rust_check}")
        
        # Install Rust if not present
        if "rustc: command not found" in str(rust_check.output):
            print("   - Installing Rust...")
            rust_install = ubuntu.bash(command="curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y")
            print(f"   - Rust install result: {rust_install}")
            
            # Source rust environment
            ubuntu.bash(command="source ~/.cargo/env")
        
        # Navigate to codex-rs directory and build
        print("   - Building Codex Rust binary...")
        build_commands = [
            "cd ~/codex-install/codex-rs",
            "source ~/.cargo/env",
            "cargo build --release"
        ]
        
        for cmd in build_commands:
            try:
                print(f"   - Running: {cmd}")
                result = ubuntu.bash(command=cmd)
                print(f"   - Result: {result}")
            except Exception as e:
                print(f"   - {cmd} failed: {e}")
        
        # Check if binary was created
        print("   - Checking for built binary...")
        binary_check = ubuntu.bash(command="find ~/codex-install/codex-rs/target/release -name 'codex*' -type f")
        print(f"   - Binary check result: {binary_check}")
        
        # Copy binary to the expected location
        if binary_check.output and "codex" in binary_check.output:
            print("   - Copying binary to expected location...")
            copy_commands = [
                "cd ~/codex-install/codex-rs",
                "cp target/release/codex bin/codex-x86_64-unknown-linux-musl",
                "chmod +x bin/codex-x86_64-unknown-linux-musl"
            ]
            
            for cmd in copy_commands:
                try:
                    result = ubuntu.bash(command=cmd)
                    print(f"   - {cmd}: {result}")
                except Exception as e:
                    print(f"   - {cmd} failed: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error building Codex Rust binary: {e}")
        return False

def test_codex_after_build(ubuntu):
    """Test Codex after building the Rust binary"""
    
    try:
        print(f"\n🧪 Testing Codex after Rust build on instance: {ubuntu.id}")
        
        # Test the CLI
        test_commands = [
            "cd ~/codex-install/codex-cli && node bin/codex.js --help",
            "cd ~/codex-install/codex-cli && node bin/codex.js version"
        ]
        
        for cmd in test_commands:
            try:
                print(f"   - Testing: {cmd}")
                result = ubuntu.bash(command=cmd)
                print(f"   - Result: {result}")
                
                if "error" not in str(result).lower() and result.output:
                    print(f"   ✅ Codex is working after Rust build!")
                    return True
                    
            except Exception as e:
                print(f"   - {cmd} failed: {e}")
        
        return False
        
    except Exception as e:
        print(f"❌ Error testing Codex after build: {e}")
        return False

def main():
    """Main build process"""
    
    print("🚀 Building Codex Rust Binary on Scrapybara Ubuntu Instance")
    print("=" * 65)
    
    # Get API key
    api_key = os.getenv('SCRAPYBARA')
    if not api_key:
        print("❌ SCRAPYBARA environment variable not found")
        return
    
    try:
        scrapy = Scrapybara(api_key=api_key)
        instances = scrapy.get_instances()
        ubuntu_instances = [inst for inst in instances if hasattr(inst, 'bash')]
        
        if not ubuntu_instances:
            print("❌ No Ubuntu instances found")
            return
        
        print(f"✅ Found {len(ubuntu_instances)} Ubuntu instances")
        
        # Use the first instance
        ubuntu = ubuntu_instances[0]
        print(f"📋 Using instance: {ubuntu.id}")
        
        # Build the Rust binary
        if build_codex_rust(ubuntu):
            print("\n✅ Codex Rust binary build completed!")
            
            # Test the installation
            if test_codex_after_build(ubuntu):
                print("\n🎉 Codex is now fully built and working!")
                print(f"   - Instance ID: {ubuntu.id}")
                print("   - You can now use: cd ~/codex-install/codex-cli && node bin/codex.js --help")
            else:
                print("\n⚠️  Build completed but testing failed")
        else:
            print("\n❌ Codex Rust binary build failed")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
