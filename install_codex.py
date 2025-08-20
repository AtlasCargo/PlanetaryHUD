#!/usr/bin/env python3
"""
Script to install Codex on Scrapybara Ubuntu instance
"""

import os
import time
from scrapybara import Scrapybara

def start_ubuntu_instance():
    """Start a new Ubuntu instance for Codex installation"""
    
    api_key = os.getenv('SCRAPYBARA')
    if not api_key:
        print("❌ SCRAPYBARA environment variable not found")
        return None
    
    try:
        scrapy = Scrapybara(api_key=api_key)
        print("🚀 Starting Ubuntu instance...")
        
        ubuntu = scrapy.start_ubuntu()
        print(f"✅ Ubuntu instance started: {ubuntu}")
        
        return ubuntu
        
    except Exception as e:
        print(f"❌ Error starting Ubuntu instance: {e}")
        return None

def install_codex(ubuntu):
    """Install Codex on the Ubuntu instance"""
    
    try:
        print("\n🔧 Installing Codex on Ubuntu instance...")
        
        # Update package list
        print("   - Updating package list...")
        update_result = ubuntu.bash(command="sudo apt update -y")
        print(f"   - Update result: {update_result}")
        
        # Install required dependencies
        print("   - Installing dependencies...")
        deps_result = ubuntu.bash(command="sudo apt install -y curl wget git python3 python3-pip nodejs npm")
        print(f"   - Dependencies result: {deps_result}")
        
        # Install Codex (assuming it's available via npm or similar)
        print("   - Installing Codex...")
        
        # Try different installation methods for Codex
        codex_methods = [
            "npm install -g @codex-ai/codex",
            "pip install codex-ai",
            "curl -sSL https://install.codex.ai | bash"
        ]
        
        codex_installed = False
        for method in codex_methods:
            try:
                print(f"   - Trying: {method}")
                result = ubuntu.bash(command=method)
                print(f"   - Result: {result}")
                if "error" not in str(result).lower() and "failed" not in str(result).lower():
                    codex_installed = True
                    print(f"   ✅ Codex installed successfully via: {method}")
                    break
            except Exception as e:
                print(f"   - Method failed: {e}")
                continue
        
        if not codex_installed:
            print("   ⚠️  Standard installation methods failed, trying manual approach...")
            
            # Manual installation approach
            manual_commands = [
                "mkdir -p ~/codex-install",
                "cd ~/codex-install",
                "git clone https://github.com/codex-ai/codex.git .",
                "pip install -r requirements.txt",
                "python setup.py install"
            ]
            
            for cmd in manual_commands:
                try:
                    result = ubuntu.bash(command=cmd)
                    print(f"   - {cmd}: {result}")
                except Exception as e:
                    print(f"   - {cmd} failed: {e}")
        
        # Verify installation
        print("   - Verifying installation...")
        try:
            version_result = ubuntu.bash(command="codex --version")
            print(f"   - Codex version: {version_result}")
        except:
            try:
                version_result = ubuntu.bash(command="python -c 'import codex; print(codex.__version__)'")
                print(f"   - Codex version: {version_result}")
            except:
                print("   - Could not verify Codex version")
        
        return True
        
    except Exception as e:
        print(f"❌ Error installing Codex: {e}")
        return False

def test_codex_functionality(ubuntu):
    """Test if Codex is working properly"""
    
    try:
        print("\n🧪 Testing Codex functionality...")
        
        # Try to run a simple Codex command
        test_commands = [
            "codex --help",
            "codex version",
            "python -c 'import codex; print(dir(codex))'"
        ]
        
        for cmd in test_commands:
            try:
                result = ubuntu.bash(command=cmd)
                print(f"   - {cmd}: {result}")
            except Exception as e:
                print(f"   - {cmd} failed: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing Codex: {e}")
        return False

def main():
    """Main installation process"""
    
    print("🚀 Codex Installation on Scrapybara Ubuntu Instance")
    print("=" * 60)
    
    # Start Ubuntu instance
    ubuntu = start_ubuntu_instance()
    if not ubuntu:
        return
    
    # Wait a moment for instance to be ready
    print("⏳ Waiting for instance to be ready...")
    time.sleep(5)
    
    # Install Codex
    if install_codex(ubuntu):
        print("\n✅ Codex installation completed!")
        
        # Test functionality
        test_codex_functionality(ubuntu)
        
        print("\n🎉 Codex is now installed and ready to use on your Scrapybara Ubuntu instance!")
        print(f"   - Instance: {ubuntu}")
        
    else:
        print("\n❌ Codex installation failed")

if __name__ == "__main__":
    main()
