#!/usr/bin/env python3
"""
Script to create a dummy binary that makes Codex CLI work
"""

import os
from scrapybara import Scrapybara

def create_dummy_binary(ubuntu):
    """Create a dummy binary that makes Codex CLI work"""
    
    try:
        print(f"\n🔧 Creating dummy binary for Codex on instance: {ubuntu.id}")
        
        # Create the bin directory in the right location
        print("   - Creating bin directory...")
        mkdir_result = ubuntu.bash(command="mkdir -p ~/codex-install/bin")
        print(f"   - Mkdir result: {mkdir_result}")
        
        # Create a simple bash script that acts as the codex binary
        print("   - Creating dummy binary script...")
        dummy_script = '''#!/bin/bash
# Dummy Codex binary for testing
echo "Codex CLI - Dummy Binary"
echo "This is a placeholder binary for testing purposes"
echo "Arguments received: $@"
echo "Command: $0 $@"

# If --help is passed, show some help
if [[ "$*" == *"--help"* ]]; then
    echo ""
    echo "Usage: codex [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  --help     Show this help message"
    echo "  version    Show version information"
    echo "  search     Search for code patterns"
    echo ""
    echo "Note: This is a dummy binary for testing the CLI interface."
    echo "The actual functionality would require the real Rust binary."
fi

# If version is passed, show version
if [[ "$*" == *"version"* ]]; then
    echo ""
    echo "Codex version: 0.0.0-dev (dummy)"
    echo "This is a placeholder binary for testing purposes"
fi

exit 0
'''
        
        # Write the script to a file
        write_result = ubuntu.bash(command=f'cat > ~/codex-install/bin/codex-x86_64-unknown-linux-musl << "EOF"\n{dummy_script}\nEOF')
        print(f"   - Write result: {write_result}")
        
        # Make it executable
        chmod_result = ubuntu.bash(command="chmod +x ~/codex-install/bin/codex-x86_64-unknown-linux-musl")
        print(f"   - Chmod result: {chmod_result}")
        
        # Test the dummy binary
        print("   - Testing dummy binary...")
        test_result = ubuntu.bash(command="~/codex-install/bin/codex-x86_64-unknown-linux-musl --help")
        print(f"   - Test result: {test_result}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating dummy binary: {e}")
        return False

def test_codex_with_dummy(ubuntu):
    """Test if Codex CLI works with the dummy binary"""
    
    try:
        print(f"\n🧪 Testing Codex CLI with dummy binary on instance: {ubuntu.id}")
        
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
                    print(f"   ✅ Codex CLI is working with dummy binary!")
                    return True
                    
            except Exception as e:
                print(f"   - {cmd} failed: {e}")
        
        return False
        
    except Exception as e:
        print(f"❌ Error testing Codex with dummy binary: {e}")
        return False

def main():
    """Main process"""
    
    print("🚀 Creating Dummy Binary for Codex CLI")
    print("=" * 50)
    
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
        
        # Create the dummy binary
        if create_dummy_binary(ubuntu):
            print("\n✅ Dummy binary created successfully!")
            
            # Test the CLI
            if test_codex_with_dummy(ubuntu):
                print("\n🎉 Codex CLI is now working with dummy binary!")
                print(f"   - Instance ID: {ubuntu.id}")
                print("   - You can now use: cd ~/codex-install/codex-cli && node bin/codex.js --help")
                print("   - Note: This is a dummy binary for testing. Real functionality requires the Rust binary.")
            else:
                print("\n⚠️  Dummy binary created but CLI testing failed")
        else:
            print("\n❌ Failed to create dummy binary")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
